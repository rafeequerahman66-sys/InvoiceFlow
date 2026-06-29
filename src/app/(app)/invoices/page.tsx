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
import { Prisma } from "@prisma/client";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { orgId } = await requireOrg();
  const { q, status } = await searchParams;

  // Typed as Prisma.InvoiceWhereInput so the dynamic `status` (a plain string
  // from searchParams) is accepted under BOTH schemas: sqlite (String) and
  // postgres (InvoiceStatus enum). The enum type itself isn't exported by the
  // sqlite client, so we cast to the field's input type instead of importing it.
  const where: Prisma.InvoiceWhereInput = {
    orgId,
    ...(status && status !== "ALL" ? { status: status as Prisma.InvoiceWhereInput["status"] } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { client: { name: { contains: q } } },
            { client: { company: { contains: q } } },
          ],
        }
      : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        number: true,
        total: true,
        currency: true,
        status: true,
        issueDate: true,
        client: { select: { name: true, company: true } },
      },
      orderBy: { issueDate: "desc" },
      take: 100,
    }),
    q || (status && status !== "ALL") ? prisma.invoice.count({ where: { orgId } }) : Promise.resolve(0),
  ]);

  const filtered = invoices;
  const allCount = q || (status && status !== "ALL") ? (total as number) : invoices.length;

  return (
    <AppShell
      title="Invoices"
      subtitle={`${filtered.length}${allCount > filtered.length ? ` of ${allCount}` : ""} invoices`}
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
