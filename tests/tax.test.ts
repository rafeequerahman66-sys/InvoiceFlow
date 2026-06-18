import { describe, it, expect } from "vitest";
import {
  resolveSupplyType,
  computeTax,
  computeInvoiceTotals,
  needsLutDeclaration,
  round2,
} from "../src/lib/tax";

describe("resolveSupplyType", () => {
  it("treats a Kerala client as intra-state", () => {
    expect(resolveSupplyType({ country: "IN", stateCode: "32" })).toBe("INTRA_STATE");
  });
  it("treats another Indian state as inter-state", () => {
    expect(resolveSupplyType({ country: "IN", stateCode: "29" })).toBe("INTER_STATE");
  });
  it("treats a foreign client as export under LUT by default", () => {
    expect(resolveSupplyType({ country: "US" })).toBe("EXPORT_LUT");
    expect(resolveSupplyType({ country: "AE", stateCode: null })).toBe("EXPORT_LUT");
  });
});

describe("computeTax", () => {
  it("splits intra-state 18% into 9% CGST + 9% SGST", () => {
    expect(computeTax("INTRA_STATE", 100000, 18)).toEqual({ cgst: 9000, sgst: 9000, igst: 0 });
  });
  it("puts the whole rate on IGST for inter-state", () => {
    expect(computeTax("INTER_STATE", 100000, 18)).toEqual({ cgst: 0, sgst: 0, igst: 18000 });
  });
  it("charges zero on export under LUT", () => {
    expect(computeTax("EXPORT_LUT", 500000, 18)).toEqual({ cgst: 0, sgst: 0, igst: 0 });
  });
  it("charges IGST on export-with-tax", () => {
    expect(computeTax("EXPORT_WITH_TAX", 100000, 18)).toEqual({ cgst: 0, sgst: 0, igst: 18000 });
  });
});

describe("needsLutDeclaration", () => {
  it("is true only for export under LUT", () => {
    expect(needsLutDeclaration("EXPORT_LUT")).toBe(true);
    expect(needsLutDeclaration("INTRA_STATE")).toBe(false);
    expect(needsLutDeclaration("INTER_STATE")).toBe(false);
  });
});

describe("computeInvoiceTotals", () => {
  it("computes a simple Kerala invoice (CGST+SGST)", () => {
    const r = computeInvoiceTotals("INTRA_STATE", [{ qty: 1, rate: 180000, taxRate: 18 }]);
    expect(r.subtotal).toBe(180000);
    expect(r.taxableValue).toBe(180000);
    expect(r.cgst).toBe(16200);
    expect(r.sgst).toBe(16200);
    expect(r.igst).toBe(0);
    expect(r.total).toBe(212400);
  });

  it("computes an inter-state invoice (IGST)", () => {
    const r = computeInvoiceTotals("INTER_STATE", [{ qty: 2, rate: 65000, taxRate: 18 }]);
    expect(r.subtotal).toBe(130000);
    expect(r.igst).toBe(23400);
    expect(r.total).toBe(153400);
  });

  it("computes a zero-tax export invoice", () => {
    const r = computeInvoiceTotals("EXPORT_LUT", [{ qty: 1, rate: 5400, taxRate: 0 }]);
    expect(r.totalTax).toBe(0);
    expect(r.total).toBe(5400);
  });

  it("applies a percentage discount before tax", () => {
    const r = computeInvoiceTotals("INTER_STATE", [{ qty: 1, rate: 100000, taxRate: 18 }], {
      type: "PERCENT",
      value: 10,
    });
    expect(r.discount).toBe(10000);
    expect(r.taxableValue).toBe(90000);
    expect(r.igst).toBe(16200);
    expect(r.total).toBe(106200);
  });

  it("applies a flat discount and never goes negative", () => {
    const r = computeInvoiceTotals("INTRA_STATE", [{ qty: 1, rate: 1000, taxRate: 18 }], {
      type: "FLAT",
      value: 5000,
    });
    expect(r.discount).toBe(1000); // capped at subtotal
    expect(r.taxableValue).toBe(0);
    expect(r.total).toBe(0);
  });

  it("handles mixed tax rates across lines", () => {
    const r = computeInvoiceTotals("INTER_STATE", [
      { qty: 1, rate: 100000, taxRate: 18 },
      { qty: 1, rate: 50000, taxRate: 12 },
    ]);
    expect(r.subtotal).toBe(150000);
    // 18% of 100k = 18000, 12% of 50k = 6000
    expect(r.igst).toBe(24000);
    expect(r.total).toBe(174000);
  });

  it("keeps line totals summing to the invoice total", () => {
    const r = computeInvoiceTotals(
      "INTRA_STATE",
      [
        { qty: 3, rate: 12345.67, taxRate: 18 },
        { qty: 1, rate: 9999.99, taxRate: 18 },
      ],
      { type: "PERCENT", value: 7.5 }
    );
    const lineSum = round2(r.lines.reduce((s, l) => s + l.lineTotal, 0));
    // allow 1 paisa rounding tolerance from proportional discount distribution
    expect(Math.abs(lineSum - r.total)).toBeLessThanOrEqual(0.02);
  });
});
