export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatMoney, toNum } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { RevenueChart, type MonthPoint } from "@/components/revenue-chart";
import { StatusDonut } from "@/components/status-donut";
import { Icon, type IconName } from "@/components/icon";
import { requireOrg } from "@/lib/tenant";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Only the columns needed for KPI computation and charts
const INV_SELECT = {
  status: true,
  totalInr: true,
  issueDate: true,
  dueDate: true,
} as const;

const RECENT_SELECT = {
  id: true,
  number: true,
  total: true,
  currency: true,
  status: true,
  issueDate: true,
  client: { select: { name: true, company: true } },
} as const;

const QUOTE_SELECT = {
  id: true,
  number: true,
  total: true,
  currency: true,
  status: true,
  client: { select: { name: true, company: true } },
} as const;

export default async function DashboardPage() {
  const { orgId, orgName, userName } = await requireOrg();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [recent, all, recentQuotes] = await Promise.all([
    prisma.invoice.findMany({
      where: { orgId },
      select: RECENT_SELECT,
      orderBy: { issueDate: "desc" },
      take: 6,
    }),
    prisma.invoice.findMany({ where: { orgId }, select: INV_SELECT }),
    prisma.quotation.findMany({
      where: { orgId },
      select: QUOTE_SELECT,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  let revenue = 0, pending = 0, overdue = 0, paidCount = 0, pendingCount = 0, overdueCount = 0;

  const now = new Date();
  const buckets: { key: string; point: MonthPoint }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, point: { label: MONTHS[d.getMonth()], value: 0 } });
  }
  const bucketMap = new Map(buckets.map((b) => [b.key, b.point]));

  for (const inv of all) {
    const inr = toNum(inv.totalInr);
    if (inv.status === "PAID") {
      revenue += inr;
      paidCount++;
      const pt = bucketMap.get(`${inv.issueDate.getFullYear()}-${inv.issueDate.getMonth()}`);
      if (pt) pt.value += inr;
    } else if (inv.status === "SENT" || inv.status === "PARTIALLY_PAID") {
      if (inv.dueDate.toISOString().slice(0, 10) < todayStr) {
        overdue += inr;
        overdueCount++;
      } else {
        pending += inr;
        pendingCount++;
      }
    }
  }

  const thisMonth = buckets[11].point.value;
  const lastMonth = buckets[10].point.value;
  const momDelta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  const kpis = [
    { label: "Total Revenue", value: formatMoney(revenue), delta: momDelta, caption: "collected" },
    { label: "Pending Payments", value: formatMoney(pending), delta: null, caption: `${pendingCount} awaiting` },
    { label: "Paid Invoices", value: String(paidCount), delta: null, caption: "marked paid" },
    { label: "Outstanding", value: formatMoney(pending + overdue), delta: null, caption: `${overdueCount} overdue` },
  ];

  const donut = [
    { label: "Paid", value: paidCount, color: "var(--accent)" },
    { label: "Pending", value: pendingCount, color: "var(--info)" },
    { label: "Overdue", value: overdueCount, color: "var(--negative)" },
  ];

  const quickActions: { label: string; href: string; icon: IconName }[] = [
    { label: "New Invoice", href: "/invoices/new", icon: "file-text" },
    { label: "New Quote", href: "/quotations/new", icon: "file-check" },
    { label: "Add Client", href: "/clients/new", icon: "users" },
    { label: "Add Product", href: "/catalog/new", icon: "package" },
  ];

  return (
    <AppShell title="Dashboard" subtitle={`Welcome back, ${userName ?? orgName}`}>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-[18px]">
            <div className="flex items-start justify-between">
              <div className="text-[12.5px] text-[var(--text-soft)]">{k.label}</div>
              {k.delta !== null && (
                <Badge tone={k.delta >= 0 ? "green" : "red"}>
                  {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta).toFixed(1)}%
                </Badge>
              )}
            </div>
            <div className="mt-2 text-[26px] font-extrabold tnum text-[var(--text)]">{k.value}</div>
            <div className="mt-0.5 text-[12px] text-[var(--text-faint)]">{k.caption}</div>
          </Card>
        ))}
      </div>

      {/* Revenue + status */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.62fr_1fr]">
        <Card>
          <CardHeader>Monthly Revenue</CardHeader>
          <CardBody>
            <div className="mb-1 text-[28px] font-extrabold tnum text-[var(--text)]">{formatMoney(revenue)}</div>
            <RevenueChart data={buckets.map((b) => b.point)} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Invoice Status</CardHeader>
          <CardBody>
            <StatusDonut segments={donut} centerLabel="invoices" />
          </CardBody>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {quickActions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--card-inset)] p-4 text-[13px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--card)] text-[var(--accent)]">
              <Icon name={a.icon} size={18} />
            </span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* Recent invoices + quotations */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.62fr_1fr]">
        <Card>
          <CardHeader>
            Recent Invoices
            <Link href="/invoices" className="text-[12px] font-semibold text-[var(--accent)]">
              View all →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[var(--text-dim)]">No invoices yet.</div>
            ) : (
              <table className="w-full text-[13px]">
                <tbody>
                  {recent.map((inv) => (
                    <tr key={inv.id} className="border-b border-[var(--row-divider)] last:border-0">
                      <td className="px-[18px] py-3 font-mono text-[12px]">
                        <Link href={`/invoices/${inv.id}`} className="text-[var(--accent)] hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-[18px] py-3 text-[var(--text-mid)]">{inv.client.company ?? inv.client.name}</td>
                      <td className="px-[18px] py-3 text-right tnum">{formatMoney(toNum(inv.total), inv.currency)}</td>
                      <td className="px-[18px] py-3 text-right">
                        <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            Recent Quotations
            <Link href="/quotations" className="text-[12px] font-semibold text-[var(--accent)]">
              View all →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {recentQuotes.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[var(--text-dim)]">No quotations yet.</div>
            ) : (
              <ul className="divide-y divide-[var(--row-divider)]">
                {recentQuotes.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/quotations/${q.id}`}
                      className="flex items-center justify-between px-[18px] py-3 hover:bg-[var(--row-hover)]"
                    >
                      <span className="font-mono text-[12px] text-[var(--text-mid)]">{q.number}</span>
                      <span className="flex items-center gap-2">
                        <span className="tnum text-[var(--text-dim)]">{formatMoney(toNum(q.total), q.currency)}</span>
                        <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
