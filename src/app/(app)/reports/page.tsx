export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatMoney, toNum } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { BarChart } from "@/components/bar-chart";
import { buttonClasses } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import {
  computeKpis,
  gstSummaryByQuarter,
  revenueByMonth,
  topClients,
  type ReportInvoice,
} from "@/lib/reports";
import { requireOrg } from "@/lib/tenant";

export default async function ReportsPage() {
  const { orgId } = await requireOrg();
  const invoices = await prisma.invoice.findMany({
    where: { orgId },
    select: {
      status: true,
      issueDate: true,
      fyLabel: true,
      taxableValue: true,
      cgst: true,
      sgst: true,
      igst: true,
      totalInr: true,
      client: { select: { name: true, company: true } },
    },
  });
  const rows: ReportInvoice[] = invoices.map((i) => ({
    status: i.status,
    issueDate: i.issueDate,
    fyLabel: i.fyLabel,
    taxableValue: toNum(i.taxableValue),
    cgst: toNum(i.cgst),
    sgst: toNum(i.sgst),
    igst: toNum(i.igst),
    totalInr: toNum(i.totalInr),
    clientName: i.client.company ?? i.client.name,
  }));

  const now = new Date();
  const kpis = computeKpis(rows, now);
  const gst = gstSummaryByQuarter(rows);
  const revenue = revenueByMonth(rows, now, 12);
  const clients = topClients(rows, 6);
  const maxClient = Math.max(1, ...clients.map((c) => c.total));

  const kpiCards = [
    { label: "Revenue (FY)", value: formatMoney(kpis.revenueFY) },
    { label: "GST Collected", value: formatMoney(kpis.gstCollected) },
    { label: "Avg. Invoice", value: formatMoney(kpis.avgInvoice) },
    { label: "Collection Rate", value: `${Math.round(kpis.collectionRate * 100)}%` },
  ];

  const exportBtn = buttonClasses("outline", "sm", "gap-1.5");

  return (
    <AppShell
      title="Reports & Analytics"
      subtitle="Revenue, GST & client reports"
      action={
        <div className="flex gap-2">
          <a className={exportBtn} href="/api/export?type=invoices">
            <Icon name="download" size={15} />
            <span className="hidden sm:inline">Invoices</span> CSV
          </a>
          <a className={buttonClasses("primary", "sm", "gap-1.5")} href="/api/export?type=gst">
            <Icon name="download" size={15} className="text-[var(--accent-ink)]" />
            <span className="hidden sm:inline">GST</span> CSV
          </a>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label} className="p-[18px]">
            <div className="text-[12.5px] text-[var(--text-soft)]">{k.label}</div>
            <div className="mt-2 text-[24px] font-extrabold tnum text-[var(--text)]">{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-[1.62fr_1fr]">
        <Card>
          <CardHeader>Revenue by Month (₹)</CardHeader>
          <CardBody>
            <BarChart data={revenue} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Top Clients</CardHeader>
          <CardBody>
            {clients.length === 0 ? (
              <div className="text-[13px] text-[var(--text-dim)]">No billed clients yet.</div>
            ) : (
              <ul className="space-y-3">
                {clients.map((c) => (
                  <li key={c.name}>
                    <div className="mb-1 flex justify-between text-[12.5px]">
                      <span className="truncate text-[var(--text-mid)]">{c.name}</span>
                      <span className="tnum text-[var(--text)]">{formatMoney(c.total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--divider)]">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(c.total / maxClient) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-3 overflow-hidden sm:mt-4">
        <CardHeader>GST Summary Report</CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Th>Period</Th>
              <Th className="text-right">Taxable</Th>
              <Th className="text-right">CGST</Th>
              <Th className="text-right">SGST</Th>
              <Th className="text-right">IGST</Th>
              <Th className="text-right">Total Tax</Th>
            </Thead>
            <tbody>
              {gst.map((r) => (
                <Tr key={r.period}>
                  <Td className="font-medium">{r.period}</Td>
                  <Td className="text-right tnum">{formatMoney(r.taxable)}</Td>
                  <Td className="text-right tnum">{formatMoney(r.cgst)}</Td>
                  <Td className="text-right tnum">{formatMoney(r.sgst)}</Td>
                  <Td className="text-right tnum">{formatMoney(r.igst)}</Td>
                  <Td className="text-right tnum font-semibold">{formatMoney(r.totalTax)}</Td>
                </Tr>
              ))}
              {gst.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[13px] text-[var(--text-dim)]">
                    No issued invoices yet — GST summary appears once you send invoices.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          </div>
        </CardBody>
      </Card>
    </AppShell>
  );
}
