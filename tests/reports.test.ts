import { describe, it, expect } from "vitest";
import {
  fyQuarter,
  gstSummaryByQuarter,
  revenueByMonth,
  topClients,
  computeKpis,
  type ReportInvoice,
} from "../src/lib/reports";

function inv(p: Partial<ReportInvoice>): ReportInvoice {
  return {
    status: "PAID",
    issueDate: new Date("2026-05-10"),
    fyLabel: "2026-27",
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalInr: 0,
    clientName: "Acme",
    ...p,
  };
}

describe("fyQuarter", () => {
  it("maps Indian FY quarters", () => {
    expect(fyQuarter(new Date("2026-04-01"))).toBe(1);
    expect(fyQuarter(new Date("2026-08-15"))).toBe(2);
    expect(fyQuarter(new Date("2026-11-30"))).toBe(3);
    expect(fyQuarter(new Date("2027-02-10"))).toBe(4);
  });
});

describe("gstSummaryByQuarter", () => {
  it("aggregates issued invoices by quarter and ignores drafts/cancelled", () => {
    const rows = gstSummaryByQuarter([
      inv({ issueDate: new Date("2026-05-10"), taxableValue: 100000, cgst: 9000, sgst: 9000, status: "PAID" }),
      inv({ issueDate: new Date("2026-06-20"), taxableValue: 50000, igst: 9000, status: "SENT" }),
      inv({ issueDate: new Date("2026-05-01"), taxableValue: 99999, status: "DRAFT" }), // ignored
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].period).toBe("Q1 2026-27");
    expect(rows[0].taxable).toBe(150000);
    expect(rows[0].cgst).toBe(9000);
    expect(rows[0].igst).toBe(9000);
    expect(rows[0].totalTax).toBe(27000);
  });
});

describe("revenueByMonth", () => {
  it("buckets only PAID into the right month", () => {
    const now = new Date("2026-06-15");
    const pts = revenueByMonth(
      [
        inv({ issueDate: new Date("2026-06-01"), totalInr: 5000, status: "PAID" }),
        inv({ issueDate: new Date("2026-05-01"), totalInr: 3000, status: "PAID" }),
        inv({ issueDate: new Date("2026-06-02"), totalInr: 9999, status: "SENT" }), // not counted
      ],
      now,
      12
    );
    expect(pts).toHaveLength(12);
    expect(pts[11]).toEqual({ label: "Jun", value: 5000 });
    expect(pts[10]).toEqual({ label: "May", value: 3000 });
  });
});

describe("topClients", () => {
  it("ranks issued billing per client", () => {
    const r = topClients([
      inv({ clientName: "Big", totalInr: 200000, status: "PAID" }),
      inv({ clientName: "Small", totalInr: 50000, status: "SENT" }),
      inv({ clientName: "Big", totalInr: 100000, status: "SENT" }),
    ]);
    expect(r[0]).toEqual({ name: "Big", total: 300000 });
    expect(r[1]).toEqual({ name: "Small", total: 50000 });
  });
});

describe("computeKpis", () => {
  it("computes revenue, GST, average and collection rate", () => {
    const now = new Date("2026-06-15");
    const k = computeKpis(
      [
        inv({ totalInr: 100000, cgst: 9000, sgst: 9000, status: "PAID", fyLabel: "2026-27" }),
        inv({ totalInr: 50000, status: "SENT", fyLabel: "2026-27" }),
      ],
      now
    );
    expect(k.revenueFY).toBe(100000);
    expect(k.gstCollected).toBe(18000);
    expect(k.avgInvoice).toBe(75000); // (100000+50000)/2 issued
    expect(k.collectionRate).toBeCloseTo(100000 / 150000, 5);
  });
});
