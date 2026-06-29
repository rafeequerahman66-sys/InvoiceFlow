"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrg, hasRole } from "@/lib/tenant";
import { createClient } from "./clients";
import { markInvoicePaid } from "./invoices";
import { sendDueRemindersForOrg } from "@/lib/automation-engine";
import { nextNumber } from "@/lib/numbering";
import { getFxRateToInr } from "@/lib/fx";
import { resolveSupplyType, computeInvoiceTotals, needsLutDeclaration, round2, type SupplyType } from "@/lib/tax";
import type { PendingAction } from "@/lib/assistant/types";

export type AssistantActionResult = { ok: boolean; message: string; href?: string };

/**
 * Execute a confirmed assistant write action. The PendingAction comes from the
 * client, so EVERYTHING is re-resolved + re-validated server-side and scoped to
 * the caller's org. Requires MEMBER role (VIEWERs get a friendly refusal, never
 * a redirect).
 */
export async function executeAssistantAction(action: PendingAction): Promise<AssistantActionResult> {
  const { orgId, userId, role } = await requireOrg("VIEWER");
  if (!hasRole(role, "MEMBER")) {
    return { ok: false, message: "You need member access to make changes. Ask an admin to upgrade your role." };
  }

  switch (action.type) {
    case "create_client": {
      const name = (action.data.name || "").trim();
      if (name.length < 2) return { ok: false, message: "A client name is required." };
      const id = await createClient({
        name,
        company: action.data.company || undefined,
        email: action.data.email || "",
        phone: action.data.phone || undefined,
        gstin: action.data.gstin || undefined,
        country: action.data.country || "IN",
        stateCode: action.data.stateCode || undefined,
        defaultCurrency: "INR",
      });
      return { ok: true, message: `Created client ${name}.`, href: `/clients/${id}` };
    }

    case "mark_paid": {
      await markInvoicePaid(action.invoiceId);
      return { ok: true, message: `Marked ${action.number} as paid.`, href: `/invoices/${action.invoiceId}` };
    }

    case "send_reminders": {
      const res = await sendDueRemindersForOrg(orgId, userId);
      return {
        ok: true,
        message:
          res.remindersSent > 0
            ? `Sent ${res.remindersSent} reminder${res.remindersSent === 1 ? "" : "s"}.${res.overdueMarked ? ` Marked ${res.overdueMarked} overdue.` : ""}`
            : "No new reminders to send (already sent today or no email on file).",
      };
    }

    case "create_invoice": {
      const data = action.data;
      const items = (data.items || [])
        .filter((i) => i && i.name && i.name.trim())
        .map((i) => ({
          name: i.name.trim().slice(0, 200),
          qty: i.qty > 0 ? i.qty : 1,
          rate: i.rate >= 0 ? i.rate : 0,
          taxRate: i.taxRate >= 0 && i.taxRate <= 28 ? i.taxRate : 18,
        }));
      if (items.length === 0) return { ok: false, message: "The invoice needs at least one line item." };

      const client = await prisma.client.findFirst({
        where: { id: data.clientId, orgId },
        select: { id: true, country: true, stateCode: true },
      });
      if (!client) return { ok: false, message: "Client not found." };

      const supplyType: SupplyType =
        (data.supplyType as SupplyType | undefined) ?? resolveSupplyType({ country: client.country, stateCode: client.stateCode });
      const currency = data.currency || "INR";
      const totals = computeInvoiceTotals(
        supplyType,
        items.map((i) => ({ qty: i.qty, rate: i.rate, taxRate: i.taxRate })),
        { type: "PERCENT", value: 0 }
      );
      const issueDate = new Date();
      const dueDate = new Date(Date.now() + (data.dueInDays > 0 ? data.dueInDays : 15) * 86400000);
      const fxRate = await getFxRateToInr(currency, issueDate);
      const totalInr = round2(totals.total * fxRate);
      const placeOfSupply =
        supplyType === "EXPORT_LUT" || supplyType === "EXPORT_WITH_TAX" ? "Export of services" : client.stateCode ?? null;
      const bank = await prisma.bankAccount.findFirst({ where: { orgId, archived: false, isDefault: true }, select: { id: true } });

      const invoice = await prisma.$transaction(async (tx) => {
        const { number, fyLabel } = await nextNumber(tx, orgId, "INVOICE", "INV", issueDate);
        return tx.invoice.create({
          data: {
            orgId,
            number,
            fyLabel,
            clientId: client.id,
            bankAccountId: bank?.id ?? null,
            status: "DRAFT",
            issueDate,
            dueDate,
            currency,
            fxRateToInr: fxRate,
            supplyType,
            placeOfSupply,
            subtotal: totals.subtotal,
            discountType: "PERCENT",
            discountValue: 0,
            taxableValue: totals.taxableValue,
            cgst: totals.cgst,
            sgst: totals.sgst,
            igst: totals.igst,
            total: totals.total,
            totalInr,
            lutDeclaration: needsLutDeclaration(supplyType),
            createdById: userId,
            items: {
              create: items.map((item, idx) => ({
                name: item.name,
                qty: item.qty,
                unit: "nos",
                rate: item.rate,
                taxRate: item.taxRate,
                lineSubtotal: totals.lines[idx].lineSubtotal,
                lineTax: totals.lines[idx].lineTax,
                lineTotal: totals.lines[idx].lineTotal,
              })),
            },
          },
        });
      });

      await prisma.activityLog.create({
        data: {
          orgId,
          actorId: userId,
          action: "invoice.created",
          entityType: "Invoice",
          entityId: invoice.id,
          meta: JSON.stringify({ number: invoice.number, via: "assistant" }),
        },
      });
      revalidatePath("/invoices");
      revalidatePath("/dashboard");
      return { ok: true, message: `Created draft invoice ${invoice.number}.`, href: `/invoices/${invoice.id}` };
    }

    default:
      return { ok: false, message: "Unknown action." };
  }
}
