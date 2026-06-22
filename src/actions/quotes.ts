"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import { nextNumber } from "@/lib/numbering";
import { getFxRateToInr } from "@/lib/fx";
import {
  resolveSupplyType,
  computeInvoiceTotals,
  needsLutDeclaration,
  round2,
  type SupplyType,
} from "@/lib/tax";
import { getMailer } from "@/lib/integrations/email";
import { createQuoteSchema, type CreateQuoteInput } from "@/lib/validators";
type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED";

const QUOTE_PREFIX = "QT";

/** Shared: compute totals + persist a quote (create or replace items on update). */
async function buildQuoteData(data: CreateQuoteInput) {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: data.clientId } });
  const supplyType: SupplyType =
    data.supplyType ?? resolveSupplyType({ country: client.country, stateCode: client.stateCode });
  const totals = computeInvoiceTotals(
    supplyType,
    data.items.map((i) => ({ qty: i.qty, rate: i.rate, taxRate: i.taxRate })),
    { type: data.discountType, value: data.discountValue }
  );
  return { client, supplyType, totals };
}

export async function createQuote(input: CreateQuoteInput) {
  const data = createQuoteSchema.parse(input);
  const userId = await currentUserId();
  const { client, supplyType, totals } = await buildQuoteData(data);

  const quote = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, "QUOTE", QUOTE_PREFIX, data.issueDate);
    return tx.quotation.create({
      data: {
        number,
        fyLabel,
        clientId: client.id,
        status: "DRAFT",
        issueDate: data.issueDate,
        validTill: data.validTill,
        currency: data.currency,
        supplyType,
        subtotal: totals.subtotal,
        discountType: data.discountType,
        discountValue: data.discountValue,
        taxableValue: totals.taxableValue,
        totalTax: totals.totalTax,
        total: totals.total,
        notes: data.notes ?? null,
        terms: data.terms ?? null,
        createdById: userId,
        items: {
          create: data.items.map((item, idx) => ({
            name: item.name,
            description: item.description ?? null,
            sacCode: item.sacCode ?? null,
            qty: item.qty,
            rate: item.rate,
            taxRate: item.taxRate,
            lineTotal: totals.lines[idx].lineTotal,
          })),
        },
      },
    });
  });

  revalidatePath("/quotations");
  redirect(`/quotations/${quote.id}`);
}

export async function updateQuote(quoteId: string, input: CreateQuoteInput) {
  const data = createQuoteSchema.parse(input);
  const existing = await prisma.quotation.findUniqueOrThrow({ where: { id: quoteId } });
  if (existing.status !== "DRAFT") throw new Error("Only draft quotations can be edited");
  const { supplyType, totals } = await buildQuoteData(data);

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId } });
    await tx.quotation.update({
      where: { id: quoteId },
      data: {
        clientId: data.clientId,
        issueDate: data.issueDate,
        validTill: data.validTill,
        currency: data.currency,
        supplyType,
        subtotal: totals.subtotal,
        discountType: data.discountType,
        discountValue: data.discountValue,
        taxableValue: totals.taxableValue,
        totalTax: totals.totalTax,
        total: totals.total,
        notes: data.notes ?? null,
        terms: data.terms ?? null,
        items: {
          create: data.items.map((item, idx) => ({
            name: item.name,
            description: item.description ?? null,
            sacCode: item.sacCode ?? null,
            qty: item.qty,
            rate: item.rate,
            taxRate: item.taxRate,
            lineTotal: totals.lines[idx].lineTotal,
          })),
        },
      },
    });
  });

  revalidatePath(`/quotations/${quoteId}`);
  revalidatePath("/quotations");
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
  await prisma.quotation.update({ where: { id: quoteId }, data: { status } });
  revalidatePath(`/quotations/${quoteId}`);
  revalidatePath("/quotations");
}

export async function deleteQuote(quoteId: string) {
  const q = await prisma.quotation.findUniqueOrThrow({ where: { id: quoteId } });
  if (q.status === "CONVERTED") throw new Error("Converted quotations cannot be deleted");
  await prisma.quotation.delete({ where: { id: quoteId } });
  revalidatePath("/quotations");
  redirect("/quotations");
}

export async function duplicateQuote(quoteId: string) {
  const src = await prisma.quotation.findUniqueOrThrow({
    where: { id: quoteId },
    include: { items: true },
  });
  const userId = await currentUserId();

  const copy = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, "QUOTE", QUOTE_PREFIX, new Date());
    return tx.quotation.create({
      data: {
        number,
        fyLabel,
        clientId: src.clientId,
        status: "DRAFT",
        issueDate: new Date(),
        validTill: new Date(Date.now() + 15 * 86400000),
        currency: src.currency,
        supplyType: src.supplyType,
        subtotal: src.subtotal,
        discountType: src.discountType,
        discountValue: src.discountValue,
        taxableValue: src.taxableValue,
        totalTax: src.totalTax,
        total: src.total,
        notes: src.notes,
        terms: src.terms,
        createdById: userId,
        items: {
          create: src.items.map((it) => ({
            name: it.name,
            description: it.description,
            sacCode: it.sacCode,
            qty: it.qty,
            rate: it.rate,
            taxRate: it.taxRate,
            lineTotal: it.lineTotal,
          })),
        },
      },
    });
  });

  revalidatePath("/quotations");
  redirect(`/quotations/${copy.id}`);
}

export async function sendQuote(quoteId: string) {
  const q = await prisma.quotation.findUniqueOrThrow({
    where: { id: quoteId },
    include: { client: true },
  });
  if (q.client.email) {
    await getMailer().send({
      to: q.client.email,
      template: "QUOTE",
      data: { number: q.number, clientName: q.client.name },
    });
  }
  if (q.status === "DRAFT") {
    await prisma.quotation.update({ where: { id: quoteId }, data: { status: "SENT" } });
  }
  revalidatePath(`/quotations/${quoteId}`);
}

/** Convert an accepted quote into a draft invoice, mirroring its line items. */
export async function convertQuoteToInvoice(quoteId: string) {
  const userId = await currentUserId();
  const quote = await prisma.quotation.findUniqueOrThrow({
    where: { id: quoteId },
    include: { items: true, client: true },
  });
  if (quote.convertedInvoiceId) redirect(`/invoices/${quote.convertedInvoiceId}`);

  const items = quote.items.map((it) => ({
    qty: Number(it.qty),
    rate: Number(it.rate),
    taxRate: Number(it.taxRate),
  }));
  const totals = computeInvoiceTotals(quote.supplyType as SupplyType, items, {
    type: quote.discountType as "PERCENT" | "FLAT",
    value: Number(quote.discountValue),
  });
  const fxRate = await getFxRateToInr(quote.currency, new Date());
  const totalInr = round2(totals.total * fxRate);
  const placeOfSupply =
    quote.supplyType === "EXPORT_LUT" || quote.supplyType === "EXPORT_WITH_TAX"
      ? "Export of services"
      : quote.client.stateCode ?? null;

  const invoice = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, "INVOICE", "INV", new Date());
    const inv = await tx.invoice.create({
      data: {
        number,
        fyLabel,
        clientId: quote.clientId,
        status: "DRAFT",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 86400000),
        currency: quote.currency,
        fxRateToInr: fxRate,
        supplyType: quote.supplyType,
        placeOfSupply,
        subtotal: totals.subtotal,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        taxableValue: totals.taxableValue,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total,
        totalInr,
        notes: quote.notes,
        terms: quote.terms,
        lutDeclaration: needsLutDeclaration(quote.supplyType as SupplyType),
        createdById: userId,
        items: {
          create: quote.items.map((it, idx) => ({
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
    await tx.quotation.update({
      where: { id: quoteId },
      data: { status: "CONVERTED", convertedInvoiceId: inv.id },
    });
    return inv;
  });

  await prisma.activityLog.create({
    data: {
      actorId: userId,
      action: "quote.converted",
      entityType: "Quotation",
      entityId: quoteId,
      meta: JSON.stringify({ invoiceId: invoice.id, invoiceNumber: invoice.number }),
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/quotations");
  redirect(`/invoices/${invoice.id}`);
}
