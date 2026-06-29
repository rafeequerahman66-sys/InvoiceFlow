export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatMoney, toNum } from "@/lib/money";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Icon } from "@/components/icon";
import { requireOrg } from "@/lib/tenant";
import { InvoiceFilters } from "./invoice-filters";
import { Suspense } from "react";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { orgId } = await requireOrg();
  const { q, status } = await searchParams;

  const invoices = await prisma.invoice.findMany({
    where: {
      orgId,
      ...(status && status !== "ALL" ? { status } : {}),
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  const filtered = q
    ? invoices.filter(
        (inv) =>
          inv.number.toLowerCase().includes(q.toLowerCase()) ||
          (inv.client.company ?? inv.client.name).toLowerCase().includes(q.toLowerCase())
      )
    : invoices;

  return (
    <AppShell
      title="Invoices"
      subtitle={`${filtered.length} of ${invoices.length}`}
      action={
        <ButtonLink href="/invoices/new" className="gap-1.5">
          <Icon name="plus" size={16} className="text-[var(--accent-ink)]" /> New Invoice
        </ButtonLink>
      }
    >
      <Suspense>
        <InvoiceFilters />
      </Suspense>
      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <Th>Number</Th>
            <Th>Client</Th>
            <Th>Issue date</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Status</Th>
          </Thead>
          <tbody>
            {filtered.map((inv) => (
              <Tr key={inv.id}>
                <Td className="font-mono text-[12px]">
                  <Link href={`/invoices/${inv.id}`} className="text-[var(--accent)] hover:underline">
                    {inv.number}
                  </Link>
                </Td>
                <Td>{inv.client.company ?? inv.client.name}</Td>
                <Td className="text-[12px] text-[var(--text-dim)]">{inv.issueDate.toISOString().slice(0, 10)}</Td>
                <Td className="text-right tnum">{formatMoney(toNum(inv.total), inv.currency)}</Td>
                <Td className="text-right">
                  <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                </Td>
              </Tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[13px] text-[var(--text-dim)]">
                  {invoices.length === 0 ? "No invoices yet." : "No invoices match the filter."}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </AppShell>
  );
}
