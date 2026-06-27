import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { toNum } from "@/lib/money";
import { gstSummaryByQuarter, type ReportInvoice } from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Escape a CSV field (quote if it contains comma/quote/newline). */
function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(",")).join("\r\n");

function csvResponse(name: string, csv: string) {
  // Prepend BOM so Excel opens UTF-8 correctly.
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const { orgId } = await requireOrg("VIEWER");
  const type = req.nextUrl.searchParams.get("type") ?? "invoices";

  if (type === "gst") {
    const invoices = await prisma.invoice.findMany({ where: { orgId }, orderBy: { issueDate: "asc" } });
    const rows: ReportInvoice[] = invoices.map((i) => ({
      status: i.status,
      issueDate: i.issueDate,
      fyLabel: i.fyLabel,
      taxableValue: toNum(i.taxableValue),
      cgst: toNum(i.cgst),
      sgst: toNum(i.sgst),
      igst: toNum(i.igst),
      totalInr: toNum(i.totalInr),
      clientName: "",
    }));
    const summary = gstSummaryByQuarter(rows);
    const csv = toCsv([
      ["Period", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax"],
      ...summary.map((r) => [r.period, r.taxable, r.cgst, r.sgst, r.igst, r.totalTax]),
    ]);
    return csvResponse("gst-summary.csv", csv);
  }

  // Default: invoices export
  const invoices = await prisma.invoice.findMany({
    where: { orgId },
    include: { client: true },
    orderBy: { issueDate: "desc" },
  });
  const csv = toCsv([
    ["Number", "Client", "Status", "Issue Date", "Due Date", "Currency", "Supply Type", "Taxable", "CGST", "SGST", "IGST", "Total", "Total INR"],
    ...invoices.map((i) => [
      i.number,
      i.client.company ?? i.client.name,
      i.status,
      i.issueDate.toISOString().slice(0, 10),
      i.dueDate.toISOString().slice(0, 10),
      i.currency,
      i.supplyType,
      toNum(i.taxableValue),
      toNum(i.cgst),
      toNum(i.sgst),
      toNum(i.igst),
      toNum(i.total),
      toNum(i.totalInr),
    ]),
  ]);
  return csvResponse("invoices.csv", csv);
}
