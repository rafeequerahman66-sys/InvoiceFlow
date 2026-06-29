"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withDbRetry } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { nextNumber } from "@/lib/numbering";
import { getFxRateToInr } from "@/lib/fx";
import { getMailer } from "@/lib/integrations/email";
import { getPaymentGateway } from "@/lib/integrations/payments";
import {
  resolveSupplyType,
  computeInvoiceTotals,
  needsLutDeclaration,
  round2,
  type SupplyType,
} from "@/lib/tax";
import {
  createInvoiceSchema,
  paymentSchema,
  type CreateInvoiceInput,
  type PaymentInput,
} from "@/lib/validators";

type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";

/** Pick the bank account to print: the requested one (if it's this org's), else the org default. */
async function resolveBankAccountId(orgId: string, requested?: string): Promise<string | null> {
  if (requested) {
    const a = await prisma.bankAccount.findFirst({ where: { id: requested, orgId, archived: false } });
    if (a) return a.id;
  }
  const def = await prisma.bankAccount.findFirst({ where: { orgId, archived: false, isDefault: true } });
  return def?.id ?? null;
}

/** Resolve supply type + computed totals + fx for a payload, scoped to org. */
async function buildInvoice(orgId: string, data: CreateInvoiceInput) {
  const client = await prisma.client.findFirst({ where: { id: data.clientId, orgId } });
  if (!client) throw new Error("Client not found");
  const supplyType: SupplyType =
    data.supplyType ?? resolveSupplyType({ country: client.country, stateCode: client.stateCode });
  const totals = computeInvoiceTotals(
    supplyType,
    data.items.map((i) => ({ qty: i.qty, rate: i.rate, taxRate: i.taxRate })),
    { type: data.discountType, value: data.discountValue }
  );
  const fxRate = await getFxRateToInr(data.currency, data.issueDate);
  const totalInr = round2(totals.total * fxRate);
  const placeOfSupply =
    supplyType === "EXPORT_LUT" || supplyType === "EXPORT_WITH_TAX"
      ? "Export of services"
      : client.stateCode ?? null;
  return { client, supplyType, totals, fxRate, totalInr, placeOfSupply };
}

export async function createInvoice(input: CreateInvoiceInput) {
  const data = createInvoiceSchema.parse(input);
  const { userId, orgId } = await requireOrg("MEMBER");
  const { client, supplyType, totals, fxRate, totalInr, placeOfSupply } = await buildInvoice(orgId, data);
  const bankAccountId = await resolveBankAccountId(orgId, data.bankAccountId);

  const invoice = await withDbRetry(() => prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, orgId, "INVOICE", "INV", data.issueDate);
    return tx.invoice.create({
      data: {
        orgId,
        number,
        fyLabel,
        clientId: client.id,
        bankAccountId,
        status: "DRAFT",
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: data.currency,
        fxRateToInr: fxRate,
        supplyType,
        placeOfSupply,
        subtotal: totals.subtotal,
        discountType: data.discountType,
        discountValue: data.discountValue,
        taxableValue: totals.taxableValue,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
        totalInr,
        notes: data.notes ?? null,
        terms: data.terms ?? null,
        lutDeclaration: needsLutDeclaration(supplyType),
        createdById: userId,
        items: {
          create: data.items.map((item, idx) => ({
            name: item.name,
            description: item.description ?? null,
            sacCode: item.sacCode ?? null,
            qty: item.qty,
            unit: item.unit ?? "nos",
            rate: item.rate,
            taxRate: item.taxRate,
            lineSubtotal: totals.lines[idx].lineSubtotal,
            lineTax: totals.lines[idx].lineTax,
            lineTotal: totals.lines[idx].lineTotal,
          })),
        },
      },
    });
  }));

  await prisma.activityLog.create({
    data: {
      orgId,
      actorId: userId,
      action: "invoice.created",
      entityType: "Invoice",
      entityId: invoice.id,
      meta: JSON.stringify({ number: invoice.number }),
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(invoiceId: string, input: CreateInvoiceInput) {
  const data = createInvoiceSchema.parse(input);
  const { orgId } = await requireOrg("MEMBER");
  const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, orgId } });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status !== "DRAFT") throw new Error("Only draft invoices can be edited");
  const { supplyType, totals, fxRate, totalInr, placeOfSupply } = await buildInvoice(orgId, data);
  const bankAccountId = await resolveBankAccountId(orgId, data.bankAccountId);

  // Batch (array) transaction — single round-trip, no connection held open
  // across awaits, and retried as a whole on a transient pooler drop. Far more
  // resilient on the Supabase pooler than an interactive transaction.
  await withDbRetry(() =>
    prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          clientId: data.clientId,
          bankAccountId,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          currency: data.currency,
          fxRateToInr: fxRate,
          supplyType,
          placeOfSupply,
          subtotal: totals.subtotal,
          discountType: data.discountType,
          discountValue: data.discountValue,
          taxableValue: totals.taxableValue,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          total: totals.total,
          totalInr,
          notes: data.notes ?? null,
          terms: data.terms ?? null,
          lutDeclaration: needsLutDeclaration(supplyType),
          items: {
            create: data.items.map((item, idx) => ({
              name: item.name,
              description: item.description ?? null,
              sacCode: item.sacCode ?? null,
              qty: item.qty,
              unit: item.unit ?? "nos",
              rate: item.rate,
              taxRate: item.taxRate,
              lineSubtotal: totals.lines[idx].lineSubtotal,
              lineTax: totals.lines[idx].lineTax,
              lineTotal: totals.lines[idx].lineTotal,
            })),
          },
        },
      }),
    ])
  );

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function duplicateInvoice(invoiceId: string) {
  const { userId, orgId } = await requireOrg("MEMBER");
  const src = await prisma.invoice.findFirst({ where: { id: invoiceId, orgId }, include: { items: true } });
  if (!src) throw new Error("Invoice not found");

  const copy = await withDbRetry(() => prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, orgId, "INVOICE", "INV", new Date());
    return tx.invoice.create({
      data: {
        orgId,
        number,
        fyLabel,
        clientId: src.clientId,
        status: "DRAFT",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 86400000),
        currency: src.currency,
        fxRateToInr: src.fxRateToInr,
        supplyType: src.supplyType,
        placeOfSupply: src.placeOfSupply,
        subtotal: src.subtotal,
        discountType: src.discountType,
        discountValue: src.discountValue,
        taxableValue: src.taxableValue,
        cgst: src.cgst,
        sgst: src.sgst,
        igst: src.igst,
        total: src.total,
        totalInr: src.totalInr,
        notes: src.notes,
        terms: src.terms,
        lutDeclaration: src.lutDeclaration,
        createdById: userId,
        items: {
          create: src.items.map((it) => ({
            name: it.name,
            description: it.description,
            sacCode: it.sacCode,
            qty: it.qty,
            unit: it.unit,
            rate: it.rate,
            taxRate: it.taxRate,
            lineSubtotal: it.lineSubtotal,
            lineTax: it.lineTax,
            lineTotal: it.lineTotal,
          })),
        },
      },
    });
  }));

  revalidatePath("/invoices");
  redirect(`/invoices/${copy.id}`);
}

export async function deleteInvoice(invoiceId: string) {
  const { orgId } = await requireOrg("MEMBER");
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, orgId } });
  if (!inv) throw new Error("Invoice not found");
  if (inv.status !== "DRAFT") throw new Error("Only draft invoices can be deleted. Cancel issued invoices instead.");
  await prisma.invoice.delete({ where: { id: invoiceId } });
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  const { orgId } = await requireOrg("MEMBER");
  await prisma.invoice.updateMany({ where: { id: invoiceId, orgId }, data: { status } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

/** Record a payment and recompute status from the sum of payments vs total. */
export async function recordPayment(input: PaymentInput) {
  const data = paymentSchema.parse(input);
  const { userId, orgId } = await requireOrg("MEMBER");
  const inv = await prisma.invoice.findFirst({
    where: { id: data.invoiceId, orgId },
    include: { payments: true },
  });
  if (!inv) throw new Error("Invoice not found");

  await prisma.payment.create({
    data: {
      invoiceId: inv.id,
      amount: data.amount,
      currency: inv.currency,
      method: data.method,
      reference: data.reference ?? null,
      paidAt: data.paidAt,
      notes: data.notes ?? null,
    },
  });

  const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0) + data.amount;
  const total = Number(inv.total);
  const status: InvoiceStatus = paid >= total ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : (inv.status as InvoiceStatus);

  await prisma.invoice.update({ where: { id: inv.id }, data: { status } });
  await prisma.activityLog.create({
    data: {
      orgId,
      actorId: userId,
      action: "invoice.payment",
      entityType: "Invoice",
      entityId: inv.id,
      meta: JSON.stringify({ amount: data.amount, method: data.method }),
    },
  });

  revalidatePath(`/invoices/${inv.id}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

/** Convenience: mark fully paid in one click (records the outstanding balance). */
export async function markInvoicePaid(invoiceId: string) {
  const { orgId } = await requireOrg("MEMBER");
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, orgId }, include: { payments: true } });
  if (!inv) throw new Error("Invoice not found");
  const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = round2(Number(inv.total) - paid);
  if (balance > 0) {
    await recordPayment({ invoiceId, amount: balance, method: "BANK_TRANSFER", paidAt: new Date() });
  } else {
    await updateInvoiceStatus(invoiceId, "PAID");
  }
}

export async function sendInvoice(invoiceId: string) {
  const { orgId } = await requireOrg("MEMBER");
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, orgId }, include: { client: true } });
  if (!inv) throw new Error("Invoice not found");
  if (inv.client.email) {
    await getMailer().send({
      to: inv.client.email,
      template: "INVOICE",
      data: { number: inv.number, clientName: inv.client.name },
    });
  }
  if (inv.status === "DRAFT") {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "SENT" } });
  }
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

/** Create an online payment link via the configured gateway (mock by default). */
export async function createPaymentLink(invoiceId: string): Promise<string> {
  const { orgId } = await requireOrg("MEMBER");
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, orgId } });
  if (!inv) throw new Error("Invoice not found");
  const link = await getPaymentGateway().createPaymentLink({
    invoiceId: inv.id,
    amount: Number(inv.total),
    currency: inv.currency,
    description: `Invoice ${inv.number}`,
  });
  return link.url;
}

export async function cancelInvoice(invoiceId: string) {
  const { orgId } = await requireOrg("MEMBER");
  // Soft-cancel to keep the FY number sequence gapless — never hard-delete issued invoices.
  await prisma.invoice.updateMany({ where: { id: invoiceId, orgId }, data: { status: "CANCELLED" } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}
