/**
 * Reporting aggregations — pure functions over normalized invoice rows so they
 * are unit-testable and free of Prisma/React. Money is in INR (book value).
 */
import { fyLabelFor } from "@/lib/numbering";
import { round2 } from "@/lib/tax";

export type ReportInvoice = {
  status: string;
  issueDate: Date;
  fyLabel: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalInr: number;
  clientName: string;
};

const ISSUED = (s: string) => s !== "DRAFT" && s !== "CANCELLED";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Indian FY quarter: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar. */
export function fyQuarter(date: Date): 1 | 2 | 3 | 4 {
  const m = date.getMonth(); // 0=Jan
  if (m >= 3 && m <= 5) return 1;
  if (m >= 6 && m <= 8) return 2;
  if (m >= 9 && m <= 11) return 3;
  return 4; // Jan–Mar
}

export type GstQuarterRow = {
  period: string; // e.g. "Q1 2026-27"
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
};

/** GST summary grouped by FY quarter (issued invoices only), most recent first. */
export function gstSummaryByQuarter(invoices: ReportInvoice[]): GstQuarterRow[] {
  const map = new Map<string, GstQuarterRow & { sortKey: number }>();
  for (const inv of invoices) {
    if (!ISSUED(inv.status)) continue;
    const q = fyQuarter(inv.issueDate);
    const key = `${inv.fyLabel}-Q${q}`;
    const startYear = Number(inv.fyLabel.slice(0, 4));
    const sortKey = startYear * 10 + q;
    const row =
      map.get(key) ?? { period: `Q${q} ${inv.fyLabel}`, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, sortKey };
    row.taxable = round2(row.taxable + inv.taxableValue);
    row.cgst = round2(row.cgst + inv.cgst);
    row.sgst = round2(row.sgst + inv.sgst);
    row.igst = round2(row.igst + inv.igst);
    row.totalTax = round2(row.cgst + row.sgst + row.igst);
    map.set(key, row);
  }
  return [...map.values()]
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ sortKey: _sortKey, ...r }) => r);
}

export type MonthPoint = { label: string; value: number };

/** Collected revenue (PAID, totalInr) by month for the last `count` months. */
export function revenueByMonth(invoices: ReportInvoice[], now: Date, count = 12): MonthPoint[] {
  const buckets: { key: string; point: MonthPoint }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, point: { label: MONTHS[d.getMonth()], value: 0 } });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b.point]));
  for (const inv of invoices) {
    if (inv.status !== "PAID") continue;
    const pt = byKey.get(`${inv.issueDate.getFullYear()}-${inv.issueDate.getMonth()}`);
    if (pt) pt.value = round2(pt.value + inv.totalInr);
  }
  return buckets.map((b) => b.point);
}

export type ClientTotal = { name: string; total: number };

/** Top clients by issued billing (totalInr), descending. */
export function topClients(invoices: ReportInvoice[], n = 5): ClientTotal[] {
  const map = new Map<string, number>();
  for (const inv of invoices) {
    if (!ISSUED(inv.status)) continue;
    map.set(inv.clientName, round2((map.get(inv.clientName) ?? 0) + inv.totalInr));
  }
  return [...map.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

export type ReportKpis = {
  revenueFY: number; // collected (PAID) in the current FY
  gstCollected: number; // CGST+SGST+IGST on PAID invoices
  avgInvoice: number; // avg totalInr of issued invoices
  collectionRate: number; // collected / billed (0–1)
};

export function computeKpis(invoices: ReportInvoice[], now: Date): ReportKpis {
  const currentFy = fyLabelFor(now);
  let revenueFY = 0,
    gstCollected = 0,
    billed = 0,
    collected = 0,
    issuedCount = 0,
    issuedTotal = 0;

  for (const inv of invoices) {
    if (ISSUED(inv.status)) {
      billed = round2(billed + inv.totalInr);
      issuedCount++;
      issuedTotal = round2(issuedTotal + inv.totalInr);
    }
    if (inv.status === "PAID") {
      collected = round2(collected + inv.totalInr);
      gstCollected = round2(gstCollected + inv.cgst + inv.sgst + inv.igst);
      if (inv.fyLabel === currentFy) revenueFY = round2(revenueFY + inv.totalInr);
    }
  }

  return {
    revenueFY,
    gstCollected,
    avgInvoice: issuedCount > 0 ? round2(issuedTotal / issuedCount) : 0,
    collectionRate: billed > 0 ? collected / billed : 0,
  };
}
