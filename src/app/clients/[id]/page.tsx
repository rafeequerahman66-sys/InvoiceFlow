export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatMoney, toNum } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, statusTone } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { ClientDangerZone } from "./client-danger";
import { requireOrg } from "@/lib/tenant";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireOrg();
  const client = await prisma.client.findFirst({
    where: { id, orgId },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 100 },
      quotes: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!client) notFound();

  const live = client.invoices.filter((i) => i.status !== "CANCELLED");
  const billed = live.reduce((s, i) => s + toNum(i.totalInr), 0);
  const outstanding = live
    .filter((i) => i.status === "SENT" || i.status === "PARTIALLY_PAID" || i.status === "OVERDUE")
    .reduce((s, i) => s + toNum(i.totalInr), 0);

  const stats = [
    { label: "Total Billed", value: formatMoney(billed) },
    { label: "Outstanding", value: formatMoney(outstanding), negative: outstanding > 0 },
    { label: "Invoices", value: String(client.invoices.length) },
    { label: "Quotations", value: String(client.quotes.length) },
  ];

  return (
    <AppShell
      title={client.company ?? client.name}
      subtitle="Client"
      action={
        <ButtonLink href={`/clients/${client.id}/edit`} variant="secondary">
          Edit client
        </ButtonLink>
      }
    >
      <Link href="/clients" className="mb-4 inline-block text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">
        ← Clients
      </Link>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-[18px]">
            <div className="text-[12.5px] text-[var(--text-soft)]">{s.label}</div>
            <div
              className="mt-2 text-[22px] font-extrabold tnum"
              style={s.negative ? { color: "var(--negative)" } : undefined}
            >
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader>Contact</CardHeader>
            <CardBody className="space-y-1 text-[13px]">
              <div className="font-semibold text-[var(--text)]">{client.name}</div>
              {client.email && <div className="text-[var(--text-dim)]">{client.email}</div>}
              {client.phone && <div className="text-[var(--text-dim)]">{client.phone}</div>}
              {client.billingAddress && (
                <div className="whitespace-pre-wrap text-[var(--text-dim)]">{client.billingAddress}</div>
              )}
              {client.gstin && <div className="font-mono text-[12px] text-[var(--text-mid)]">GSTIN {client.gstin}</div>}
              <div className="pt-2 text-[12px] text-[var(--text-faint)]">
                {client.country} · {client.defaultCurrency}
              </div>
            </CardBody>
          </Card>
          <ClientDangerZone clientId={client.id} canDelete={client.invoices.length === 0 && client.quotes.length === 0} />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>Invoice history</CardHeader>
          <CardBody className="p-0">
            <Table>
              <Thead>
                <Th>Number</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Status</Th>
              </Thead>
              <tbody>
                {client.invoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td className="font-mono text-[12px]">
                      <Link href={`/invoices/${inv.id}`} className="text-[var(--accent)] hover:underline">
                        {inv.number}
                      </Link>
                    </Td>
                    <Td className="text-right tnum">{formatMoney(toNum(inv.total), inv.currency)}</Td>
                    <Td className="text-right">
                      <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                    </Td>
                  </Tr>
                ))}
                {client.invoices.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-[13px] text-[var(--text-dim)]">
                      No invoices yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
