import "server-only";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { round2 } from "@/lib/tax";
import type { ReportInvoice } from "@/lib/reports";

/** Open = issued but not fully paid/cancelled. Literal status arrays only (postgres enum-safe). */
const OPEN_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

const DAY = 86400000;

export type OpenInvoice = {
  id: string;
  number: string;
  clientName: string;
  status: string;
  currency: string;
  total: number; // invoice currency
  totalInr: number;
  paid: number; // invoice currency
  outstanding: number; // invoice currency
  outstandingInr: number;
  dueDate: Date;
  daysToDue: number; // negative => overdue
};

function daysBetween(from: Date, to: Date): number {
  // Use UTC calendar fields so the assistant's day boundary matches the reminder
  // engine (automation-engine.ts), which compares UTC date strings.
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / DAY);
}

export function dueLabel(dueDate: Date, now: Date): string {
  const d = daysBetween(now, dueDate);
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due in ${d} days`;
}

/** All open (unpaid, issued) invoices with outstanding computed. */
export async function getOpenInvoices(orgId: string, now: Date): Promise<OpenInvoice[]> {
  const rows = await prisma.invoice.findMany({
    where: { orgId, status: { in: [...OPEN_STATUSES] } },
    select: {
      id: true,
      number: true,
      status: true,
      currency: true,
      total: true,
      totalInr: true,
      dueDate: true,
      client: { select: { name: true, company: true } },
      payments: { select: { amount: true } },
    },
  });
  return rows.map((inv) => {
    const total = toNum(inv.total);
    const totalInr = toNum(inv.totalInr);
    const paid = inv.payments.reduce((s, p) => s + toNum(p.amount), 0);
    const outstanding = round2(Math.max(0, total - paid));
    const paidFraction = total > 0 ? Math.min(1, paid / total) : 0;
    return {
      id: inv.id,
      number: inv.number,
      clientName: inv.client.company ?? inv.client.name,
      status: inv.status,
      currency: inv.currency,
      total,
      totalInr,
      paid,
      outstanding,
      outstandingInr: round2(totalInr * (1 - paidFraction)),
      dueDate: inv.dueDate,
      daysToDue: daysBetween(now, inv.dueDate),
    };
  });
}

/** Set of invoice ids that have ever had a reminder logged. */
export async function getReminderSentSet(orgId: string, invoiceIds: string[]): Promise<Set<string>> {
  if (invoiceIds.length === 0) return new Set();
  const logs = await prisma.activityLog.findMany({
    where: { orgId, action: "invoice.reminder", entityId: { in: invoiceIds } },
    select: { entityId: true },
  });
  return new Set(logs.map((l) => l.entityId));
}

/** Normalize every invoice into the pure ReportInvoice shape for reports.ts helpers. */
export async function getReportInvoices(orgId: string): Promise<ReportInvoice[]> {
  const rows = await prisma.invoice.findMany({
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
  return rows.map((i) => ({
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
}

export type StatusCounts = Record<string, number>;

export async function getInvoiceStatusCounts(orgId: string): Promise<StatusCounts> {
  const grouped = await prisma.invoice.groupBy({
    by: ["status"],
    where: { orgId },
    _count: { _all: true },
  });
  const out: StatusCounts = {};
  for (const g of grouped) out[g.status] = g._count._all;
  return out;
}

export async function getQuoteStatusCounts(orgId: string): Promise<StatusCounts> {
  const grouped = await prisma.quotation.groupBy({
    by: ["status"],
    where: { orgId },
    _count: { _all: true },
  });
  const out: StatusCounts = {};
  for (const g of grouped) out[g.status] = g._count._all;
  return out;
}

export type ClientStats = {
  total: number;
  withPending: number;
  newThisMonth: number;
  topClient: { name: string; billed: number } | null;
};

export async function getClientStats(orgId: string, now: Date): Promise<ClientStats> {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [total, newThisMonth, openInvoices, reportInvoices] = await Promise.all([
    prisma.client.count({ where: { orgId, archived: false } }),
    prisma.client.count({ where: { orgId, createdAt: { gte: startOfMonth } } }),
    getOpenInvoices(orgId, now),
    getReportInvoices(orgId),
  ]);
  const withPending = new Set(openInvoices.map((i) => i.clientName)).size;
  // top client by issued billing (INR)
  const billedByClient = new Map<string, number>();
  for (const inv of reportInvoices) {
    if (inv.status === "DRAFT" || inv.status === "CANCELLED") continue;
    billedByClient.set(inv.clientName, round2((billedByClient.get(inv.clientName) ?? 0) + inv.totalInr));
  }
  const top = [...billedByClient.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    total,
    withPending,
    newThisMonth,
    topClient: top ? { name: top[0], billed: top[1] } : null,
  };
}

/** Fuzzy client lookup: exact → contains (name/company), org-scoped. */
export async function findClients(orgId: string, query: string, take = 5) {
  const q = query.trim();
  return prisma.client.findMany({
    where: {
      orgId,
      archived: false,
      OR: [{ name: { contains: q } }, { company: { contains: q } }],
    },
    select: { id: true, name: true, company: true, email: true, phone: true, gstin: true, billingAddress: true, defaultCurrency: true, country: true, stateCode: true },
    take,
    orderBy: { name: "asc" },
  });
}

export type ClientDetail = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  billingAddress: string | null;
  currency: string;
  invoiceCount: number;
  paidCount: number;
  outstandingInr: number;
  lastPaymentAt: Date | null;
};

export async function getClientDetail(orgId: string, clientId: string, now: Date): Promise<ClientDetail | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, orgId },
    select: { id: true, name: true, company: true, email: true, phone: true, gstin: true, billingAddress: true, defaultCurrency: true },
  });
  if (!client) return null;
  const [invoiceCount, paidCount, open, lastPayment] = await Promise.all([
    prisma.invoice.count({ where: { orgId, clientId } }),
    prisma.invoice.count({ where: { orgId, clientId, status: "PAID" } }),
    getOpenInvoices(orgId, now),
    prisma.payment.findFirst({
      where: { invoice: { orgId, clientId } },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true },
    }),
  ]);
  const outstandingInr = round2(
    open.filter((i) => i.clientName === (client.company ?? client.name)).reduce((s, i) => s + i.outstandingInr, 0)
  );
  return {
    id: client.id,
    name: client.company ?? client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    gstin: client.gstin,
    billingAddress: client.billingAddress,
    currency: client.defaultCurrency,
    invoiceCount,
    paidCount,
    outstandingInr,
    lastPaymentAt: lastPayment?.paidAt ?? null,
  };
}

/** Revenue collected (PAID) in a given month offset (0 = this month, -1 = last). */
export async function getMonthlyCollected(orgId: string, now: Date): Promise<{ thisMonth: number; lastMonth: number }> {
  const reportInvoices = await getReportInvoices(orgId);
  const ym = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const thisKey = ym(now);
  const lastKey = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  let thisMonth = 0;
  let lastMonth = 0;
  for (const inv of reportInvoices) {
    if (inv.status !== "PAID") continue;
    const k = ym(inv.issueDate);
    if (k === thisKey) thisMonth = round2(thisMonth + inv.totalInr);
    else if (k === lastKey) lastMonth = round2(lastMonth + inv.totalInr);
  }
  return { thisMonth, lastMonth };
}
