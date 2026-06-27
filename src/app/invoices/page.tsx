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

export default async function InvoicesPage() {
  const { orgId } = await requireOrg();
  const invoices = await prisma.invoice.findMany({
    where: { orgId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell
      title="Invoices"
      subtitle={`${invoices.length} total`}
      action={
        <ButtonLink href="/invoices/new" className="gap-1.5">
          <Icon name="plus" size={16} className="text-[var(--accent-ink)]" /> New Invoice
        </ButtonLink>
      }
    >
      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <Th>Number</Th>
            <Th>Client</Th>
            <Th>Supply</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Status</Th>
          </Thead>
          <tbody>
            {invoices.map((inv) => (
              <Tr key={inv.id}>
                <Td className="font-mono text-[12px]">
                  <Link href={`/invoices/${inv.id}`} className="text-[var(--accent)] hover:underline">
                    {inv.number}
                  </Link>
                </Td>
                <Td>{inv.client.company ?? inv.client.name}</Td>
                <Td className="text-[12px] text-[var(--text-dim)]">{inv.supplyType}</Td>
                <Td className="text-right tnum">{formatMoney(toNum(inv.total), inv.currency)}</Td>
                <Td className="text-right">
                  <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                </Td>
              </Tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[13px] text-[var(--text-dim)]">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </AppShell>
  );
}
