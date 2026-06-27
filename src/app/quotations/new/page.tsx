export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { QuoteForm } from "./quote-form";
import { requireOrg } from "@/lib/tenant";

export default async function NewQuotePage() {
  const { orgId } = await requireOrg("MEMBER");
  const clients = await prisma.client.findMany({ where: { orgId, archived: false }, orderBy: { name: "asc" } });
  const catalog = await prisma.catalogItem.findMany({ where: { orgId, archived: false } });
  return (
    <AppShell title="Create Quotation" subtitle="New estimate" action={null}>
      <Link href="/quotations" className="mb-4 inline-block text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">
        ← Quotations
      </Link>
      <QuoteForm
        clients={clients.map((c) => ({
          id: c.id,
          label: c.company ?? c.name,
          country: c.country,
          stateCode: c.stateCode,
          currency: c.defaultCurrency,
        }))}
        catalog={catalog.map((p) => ({ id: p.id, name: p.name, rate: Number(p.defaultRate), tax: Number(p.defaultTax) }))}
      />
    </AppShell>
  );
}
