export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { InvoiceForm } from "../../new/invoice-form";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/invoices/${id}`);

  const clients = await prisma.client.findMany({ where: { archived: false }, orderBy: { name: "asc" } });
  const catalog = await prisma.catalogItem.findMany({ where: { archived: false } });

  return (
    <AppShell title={`Edit ${invoice.number}`} subtitle="Draft invoice" action={null}>
      <InvoiceForm
        mode="edit"
        invoiceId={invoice.id}
        clients={clients.map((c) => ({
          id: c.id,
          label: c.company ?? c.name,
          country: c.country,
          stateCode: c.stateCode,
          currency: c.defaultCurrency,
        }))}
        catalog={catalog.map((p) => ({ id: p.id, name: p.name, rate: Number(p.defaultRate), tax: Number(p.defaultTax) }))}
        initial={{
          clientId: invoice.clientId,
          currency: invoice.currency,
          issueDate: invoice.issueDate.toISOString().slice(0, 10),
          dueDate: invoice.dueDate.toISOString().slice(0, 10),
          discountType: invoice.discountType,
          discountValue: Number(invoice.discountValue),
          supplyType: invoice.supplyType,
          notes: invoice.notes ?? "",
          terms: invoice.terms ?? "",
          items: invoice.items.map((it) => ({
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
