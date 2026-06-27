"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
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

async function buildQuoteData(orgId: string, data: CreateQuoteInput) {
  const client = await prisma.client.findFirst({ where: { id: data.clientId, orgId } });
  if (!client) throw new Error("Client not found");
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
  const { userId, orgId } = await requireOrg("MEMBER");
  const { client, supplyType, totals } = await buildQuoteData(orgId, data);

  const quote = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, orgId, "QUOTE", "QT", data.issueDate);
    return tx.quotation.create({
      data: {
        orgId,
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
          create: data.items.map((item) => ({
            name: item.name,
            description: item.description ?? null,
            sacCode: item.sacCode ?? null,
            qty: item.qty,
            rate: item.rate,
            taxRate: item.taxRate,
            lineTotal: round2(item.qty * item.rate),
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
  const { orgId } = await requireOrg("MEMBER");
  const existing = await prisma.quotation.findFirst({ where: { id: quoteId, orgId } });
  if (!existing) throw new Error("Quotation not found");
  if (existing.status !== "DRAFT") throw new Error("Only draft quotations can be edited");
  const { supplyType, totals } = await buildQuoteData(orgId, data);

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
          create: data.items.map((item) => ({
            name: item.name,
            description: item.description ?? null,
            sacCode: item.sacCode ?? null,
            qty: item.qty,
            rate: item.rate,
            taxRate: item.taxRate,
            lineTotal: round2(item.qty * item.rate),
          })),
        },
      },
    });
  });

  revalidatePath(`/quotations/${quoteId}`);
  revalidatePath("/quotations");
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
  const { orgId } = await requireOrg("MEMBER");
  await prisma.quotation.updateMany({ where: { id: quoteId, orgId }, data: { status } });
  revalidatePath(`/quotations/${quoteId}`);
  revalidatePath("/quotations");
}

export async function deleteQuote(quoteId: string) {
  const { orgId } = await requireOrg("MEMBER");
  const q = await prisma.quotation.findFirst({ where: { id: quoteId, orgId } });
  if (!q) throw new Error("Quotation not found");
  if (q.status === "CONVERTED") throw new Error("Converted quotations cannot be deleted");
  await prisma.quotation.delete({ where: { id: quoteId } });
  revalidatePath("/quotations");
  redirect("/quotations");
}

export async function duplicateQuote(quoteId: string) {
  const { userId, orgId } = await requireOrg("MEMBER");
  const src = await prisma.quotation.findFirst({ where: { id: quoteId, orgId }, include: { items: true } });
  if (!src) throw new Error("Quotation not found");

  const copy = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, orgId, "QUOTE", "QT", new Date());
    return tx.quotation.create({
      data: {
        orgId,
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
  const { orgId } = await requireOrg("MEMBER");
  const q = await prisma.quotation.findFirst({ where: { id: quoteId, orgId }, include: { client: true } });
  if (!q) throw new Error("Quotation not found");
  if (q.client.email) {
    await getMailer().send({ to: q.client.email, template: "QUOTE", data: { number: q.number, clientName: q.client.name } });
  }
  if (q.status === "DRAFT") {
    await prisma.quotation.update({ where: { id: quoteId }, data: { status: "SENT" } });
  }
  revalidatePath(`/quotations/${quoteId}`);
}

/** Convert a quote into a draft invoice within the same org. */
export async function convertQuoteToInvoice(quoteId: string) {
  const { userId, orgId } = await requireOrg("MEMBER");
  const quote = await prisma.quotation.findFirst({
    where: { id: quoteId, orgId },
    include: { items: true, client: true },
  });
  if (!quote) throw new Error("Quotation not found");
  if (quote.convertedInvoiceId) redirect(`/invoices/${quote.convertedInvoiceId}`);

  const items = quote.items.map((it) => ({ qty: Number(it.qty), rate: Number(it.rate), taxRate: Number(it.taxRate) }));
  const supplyType = quote.supplyType as SupplyType;
  const totals = computeInvoiceTotals(supplyType, items, {
    type: quote.discountType as "PERCENT" | "FLAT",
    value: Number(quote.discountValue),
  });
  const fxRate = await getFxRateToInr(quote.currency, new Date());
  const totalInr = round2(totals.total * fxRate);
  const placeOfSupply =
    supplyType === "EXPORT_LUT" || supplyType === "EXPORT_WITH_TAX" ? "Export of services" : quote.client.stateCode ?? null;

  const invoice = await prisma.$transaction(async (tx) => {
    const { number, fyLabel } = await nextNumber(tx, orgId, "INVOICE", "INV", new Date());
    const inv = await tx.invoice.create({
      data: {
        orgId,
        number,
        fyLabel,
        clientId: quote.clientId,
        status: "DRAFT",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 86400000),
        currency: quote.currency,
        fxRateToInr: fxRate,
        supplyType,
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
        lutDeclaration: needsLutDeclaration(supplyType),
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
    await tx.quotation.update({ where: { id: quoteId }, data: { status: "CONVERTED", convertedInvoiceId: inv.id } });
    return inv;
  });

  await prisma.activityLog.create({
    data: {
      orgId,
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
