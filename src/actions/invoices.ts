"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUserId } from "@/lib/session";
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
import type { InvoiceStatus } from "@prisma/client";

/** Resolve supply type + computed totals + fx for a payload. */
async function buildInvoice(data: CreateInvoiceInput) {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: data.clientId } });
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
  const userId = await currentUserId();
  const { client, supplyType, totals, fxRate, totalInr, placeOfSupply } = await buildInvoice(data);

  const invoice = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, "INVOICE", "INV", data.issueDate);
    return tx.invoice.create({
      data: {
        number,
        fyLabel,
        clientId: client.id,
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
  });

  await prisma.activityLog.create({
    data: {
      actorId: userId,
      action: "invoice.created",
      entityType: "Invoice",
      entityId: invoice.id,
      meta: { number: invoice.number },
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(invoiceId: string, input: CreateInvoiceInput) {
  const data = createInvoiceSchema.parse(input);
  const existing = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (existing.status !== "DRAFT") throw new Error("Only draft invoices can be edited");
  const { supplyType, totals, fxRate, totalInr, placeOfSupply } = await buildInvoice(data);

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        clientId: data.clientId,
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
    });
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function duplicateInvoice(invoiceId: string) {
  const src = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: true },
  });
  const userId = await currentUserId();

  const copy = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, "INVOICE", "INV", new Date());
    return tx.invoice.create({
      data: {
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
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${copy.id}`);
}

export async function deleteInvoice(invoiceId: string) {
  const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  // Issued invoices must never be hard-deleted (GST audit trail) — cancel instead.
  if (inv.status !== "DRAFT") throw new Error("Only draft invoices can be deleted. Cancel issued invoices instead.");
  await prisma.invoice.delete({ where: { id: invoiceId } });
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

/** Record a payment and recompute status from the sum of payments vs total. */
export async function recordPayment(input: PaymentInput) {
  const data = paymentSchema.parse(input);
  const userId = await currentUserId();
  const inv = await prisma.invoice.findUniqueOrThrow({
    where: { id: data.invoiceId },
    include: { payments: true },
  });

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
  const status: InvoiceStatus = paid >= total ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : inv.status;

  await prisma.invoice.update({ where: { id: inv.id }, data: { status } });
  await prisma.activityLog.create({
    data: {
      actorId: userId,
      action: "invoice.payment",
      entityType: "Invoice",
      entityId: inv.id,
      meta: { amount: data.amount, method: data.method },
    },
  });

  revalidatePath(`/invoices/${inv.id}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

/** Convenience: mark fully paid in one click (records the outstanding balance). */
export async function markInvoicePaid(invoiceId: string) {
  const inv = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: true },
  });
  const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = round2(Number(inv.total) - paid);
  if (balance > 0) {
    await recordPayment({
      invoiceId,
      amount: balance,
      method: "BANK_TRANSFER",
      paidAt: new Date(),
    });
  } else {
    await updateInvoiceStatus(invoiceId, "PAID");
  }
}

export async function sendInvoice(invoiceId: string) {
  const inv = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { client: true },
  });
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
  const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const link = await getPaymentGateway().createPaymentLink({
    invoiceId: inv.id,
    amount: Number(inv.total),
    currency: inv.currency,
    description: `Invoice ${inv.number}`,
  });
  return link.url;
}

export async function cancelInvoice(invoiceId: string) {
  // Soft-cancel to keep the FY number sequence gapless — never hard-delete issued invoices.
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "CANCELLED" } });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}
