export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { InvoiceForm } from "./invoice-form";
import { requireOrg } from "@/lib/tenant";

export default async function NewInvoicePage() {
  const { orgId } = await requireOrg("MEMBER");
  const [clients, catalog, bankAccounts] = await Promise.all([
    prisma.client.findMany({
      where: { orgId, archived: false },
      select: { id: true, name: true, company: true, country: true, stateCode: true, defaultCurrency: true },
      orderBy: { name: "asc" },
    }),
    prisma.catalogItem.findMany({
      where: { orgId, archived: false },
      select: { id: true, name: true, defaultRate: true, defaultTax: true },
    }),
    prisma.bankAccount.findMany({
      where: { orgId, archived: false },
      select: { id: true, label: true, bankName: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);
  return (
    <AppShell title="Create Invoice" subtitle="New tax invoice" action={null}>
      <Link href="/invoices" className="mb-4 inline-block text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">
        ← Invoices
      </Link>
      <InvoiceForm
        clients={clients.map((c) => ({
          id: c.id,
          label: c.company ?? c.name,
          country: c.country,
          stateCode: c.stateCode,
          currency: c.defaultCurrency,
        }))}
        catalog={catalog.map((p) => ({ id: p.id, name: p.name, rate: Number(p.defaultRate), tax: Number(p.defaultTax) }))}
        bankAccounts={bankAccounts.map((b) => ({ id: b.id, label: b.label, bankName: b.bankName, isDefault: b.isDefault }))}
      />
    </AppShell>
  );
}
