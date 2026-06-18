export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { QuoteForm } from "../../new/quote-form";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
  if (!quote) notFound();
  if (quote.status !== "DRAFT") redirect(`/quotations/${id}`);

  const clients = await prisma.client.findMany({ where: { archived: false }, orderBy: { name: "asc" } });
  const catalog = await prisma.catalogItem.findMany({ where: { archived: false } });

  return (
    <AppShell title={`Edit ${quote.number}`} subtitle="Draft quotation" action={null}>
      <QuoteForm
        mode="edit"
        quoteId={quote.id}
        clients={clients.map((c) => ({
          id: c.id,
          label: c.company ?? c.name,
          country: c.country,
          stateCode: c.stateCode,
          currency: c.defaultCurrency,
        }))}
        catalog={catalog.map((p) => ({ id: p.id, name: p.name, rate: Number(p.defaultRate), tax: Number(p.defaultTax) }))}
        initial={{
          clientId: quote.clientId,
          currency: quote.currency,
          issueDate: quote.issueDate.toISOString().slice(0, 10),
          validTill: quote.validTill.toISOString().slice(0, 10),
          discountType: quote.discountType,
          discountValue: Number(quote.discountValue),
          supplyType: quote.supplyType,
          notes: quote.notes ?? "",
          items: quote.items.map((it) => ({
            name: it.name,
            description: it.description ?? "",
            qty: Number(it.qty),
            rate: Number(it.rate),
            taxRate: Number(it.taxRate),
          })),
        }}
      />
    </AppShell>
  );
}
