"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import { nextNumber } from "@/lib/numbering";
import { getFxRateToInr } from "@/lib/fx";
import { computeInvoiceTotals, needsLutDeclaration, round2, type SupplyType } from "@/lib/tax";
import { createRecurringSchema, type CreateRecurringInput } from "@/lib/validators";

type Cadence = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

/** Advance a date by one cadence step. */
function advanceByCadence(date: Date, cadence: Cadence): Date {
  const d = new Date(date);
  switch (cadence) {
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      break;
    case "QUARTERLY":
      d.setMonth(d.getMonth() + 3);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

export async function createRecurring(input: CreateRecurringInput) {
  const data = createRecurringSchema.parse(input);
  const userId = await currentUserId();
  const client = await prisma.client.findUniqueOrThrow({ where: { id: data.clientId } });
  const supplyType: SupplyType =
    data.supplyType ??
    (client.country !== "IN" ? "EXPORT_LUT" : client.stateCode === "32" ? "INTRA_STATE" : "INTER_STATE");

  await prisma.recurringInvoice.create({
    data: {
      title: data.title ?? null,
      clientId: client.id,
      cadence: data.cadence,
      nextRunDate: data.nextRunDate,
      currency: data.currency,
      supplyType,
      discountType: data.discountType,
      discountValue: data.discountValue,
      notes: data.notes ?? null,
      terms: data.terms ?? null,
      createdById: userId,
      items: {
        create: data.items.map((it) => ({
          name: it.name,
          description: it.description ?? null,
          sacCode: it.sacCode ?? null,
          qty: it.qty,
          rate: it.rate,
          taxRate: it.taxRate,
        })),
      },
    },
  });

  revalidatePath("/automations");
  redirect("/automations");
}

export async function toggleRecurring(id: string) {
  const r = await prisma.recurringInvoice.findUniqueOrThrow({ where: { id } });
  await prisma.recurringInvoice.update({ where: { id }, data: { active: !r.active } });
  revalidatePath("/automations");
}

export async function deleteRecurring(id: string) {
  await prisma.recurringInvoice.delete({ where: { id } });
  revalidatePath("/automations");
}

/** Generate one DRAFT invoice from a recurring template (no side effects on schedule). */
async function generateOne(recurringId: string, issueDate: Date, userId: string): Promise<string> {
  const rec = await prisma.recurringInvoice.findUniqueOrThrow({
    where: { id: recurringId },
    include: { items: true, client: true },
  });
  const items = rec.items.map((it) => ({ qty: Number(it.qty), rate: Number(it.rate), taxRate: Number(it.taxRate) }));
  const supplyType = rec.supplyType as SupplyType;
  const totals = computeInvoiceTotals(supplyType, items, {
    type: rec.discountType as "PERCENT" | "FLAT",
    value: Number(rec.discountValue),
  });
  const fxRate = await getFxRateToInr(rec.currency, issueDate);
  const totalInr = round2(totals.total * fxRate);
  const placeOfSupply =
    supplyType === "EXPORT_LUT" || supplyType === "EXPORT_WITH_TAX" ? "Export of services" : rec.client.stateCode ?? null;

  const invoice = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, "INVOICE", "INV", issueDate);
    return tx.invoice.create({
      data: {
        number,
        fyLabel,
        clientId: rec.clientId,
        status: "DRAFT",
        issueDate,
        dueDate: new Date(issueDate.getTime() + 15 * 86400000),
        currency: rec.currency,
        fxRateToInr: fxRate,
        supplyType,
        placeOfSupply,
        subtotal: totals.subtotal,
        discountType: rec.discountType,
        discountValue: rec.discountValue,
        taxableValue: totals.taxableValue,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
        totalInr,
        notes: rec.notes,
        terms: rec.terms,
        lutDeclaration: needsLutDeclaration(supplyType),
        createdById: userId,
        items: {
          create: rec.items.map((it, idx) => ({
            name: it.name,
            description: it.description,
            sacCode: it.sacCode,
            qty: it.qty,
            rate: it.rate,
            taxRate: it.taxRate,
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
      actorId: userId,
      action: "recurring.generated",
      entityType: "RecurringInvoice",
      entityId: recurringId,
      meta: JSON.stringify({ invoiceId: invoice.id, number: invoice.number }),
    },
  });
  return invoice.id;
}

/** Generate immediately from a template and advance its schedule. */
export async function runRecurringNow(id: string) {
  const userId = await currentUserId();
  const invoiceId = await generateOne(id, new Date(), userId);
  const rec = await prisma.recurringInvoice.findUniqueOrThrow({ where: { id } });
  await prisma.recurringInvoice.update({
    where: { id },
    data: { lastRunAt: new Date(), nextRunDate: advanceByCadence(rec.nextRunDate, rec.cadence as Cadence) },
  });
  revalidatePath("/automations");
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

/** Generate invoices for every active template whose nextRunDate has passed. */
export async function generateDueRecurring(now: Date = new Date()): Promise<number> {
  const userId = await currentUserId();
  const due = await prisma.recurringInvoice.findMany({
    where: { active: true, nextRunDate: { lte: now } },
  });
  let created = 0;
  for (const rec of due) {
    // Catch up if several periods elapsed, capped to avoid runaway generation.
    let runDate = new Date(rec.nextRunDate);
    let next = runDate;
    for (let i = 0; i < 24 && runDate <= now; i++) {
      await generateOne(rec.id, runDate, userId);
      created++;
      next = advanceByCadence(runDate, rec.cadence as Cadence);
      runDate = next;
    }
    await prisma.recurringInvoice.update({
      where: { id: rec.id },
      data: { lastRunAt: now, nextRunDate: next },
    });
  }
  revalidatePath("/automations");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return created;
}
