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

export default async function QuotationsPage() {
  const quotes = await prisma.quotation.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      title="Quotations"
      subtitle={`${quotes.length} total`}
      action={
        <ButtonLink href="/quotations/new" className="gap-1.5">
          <Icon name="plus" size={16} className="text-[var(--accent-ink)]" /> New Quotation
        </ButtonLink>
      }
    >
      <Card className="overflow-hidden">
        <Table>
          <Thead>
            <Th>Number</Th>
            <Th>Client</Th>
            <Th>Valid till</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Status</Th>
          </Thead>
          <tbody>
            {quotes.map((q) => (
              <Tr key={q.id}>
                <Td className="font-mono text-[12px]">
                  <Link href={`/quotations/${q.id}`} className="text-[var(--accent)] hover:underline">
                    {q.number}
                  </Link>
                </Td>
                <Td>{q.client.company ?? q.client.name}</Td>
                <Td className="text-[var(--text-dim)]">{q.validTill.toISOString().slice(0, 10)}</Td>
                <Td className="text-right tnum">{formatMoney(toNum(q.total), q.currency)}</Td>
                <Td className="text-right">
                  <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                </Td>
              </Tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[13px] text-[var(--text-dim)]">
                  No quotations yet.{" "}
                  <Link href="/quotations/new" className="text-[var(--accent)] hover:underline">
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </AppShell>
  );
}
