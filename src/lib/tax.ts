/**
 * Indian GST engine for Rin Media (registered in Kerala, state code 32).
 *
 * Pure, dependency-free, and unit-tested. This is the one module with legal
 * consequences if it drifts, so it must never import Prisma, React, or anything
 * with side effects.
 */

export type SupplyType =
  | "INTRA_STATE"      // Kerala -> Kerala: CGST + SGST
  | "INTER_STATE"      // Kerala -> other Indian state: IGST
  | "EXPORT_LUT"       // outside India, under LUT: 0% (no GST payable)
  | "EXPORT_WITH_TAX"; // outside India, tax paid then refunded (rare)

export interface TaxSplit {
  cgst: number;
  sgst: number;
  igst: number;
}

export interface ClientLike {
  country: string;        // ISO-2, e.g. "IN", "US"
  stateCode?: string | null; // Indian state code when country === "IN"
}

const KERALA = "32";

/** Round to 2 decimals (paise) without floating-point drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Decide the supply type from the client's location. This is the default —
 * the UI should let the user override it per invoice (e.g. an export client
 * who hasn't filed an LUT that year).
 */
export function resolveSupplyType(client: ClientLike): SupplyType {
  if (client.country !== "IN") return "EXPORT_LUT";
  if (client.stateCode === KERALA) return "INTRA_STATE";
  return "INTER_STATE";
}

/**
 * Compute the GST split for a single taxable value at a given rate (e.g. 18).
 * Returns rounded paise. Intra-state splits the rate in half across CGST/SGST.
 */
export function computeTax(
  supplyType: SupplyType,
  taxableValue: number,
  rate: number
): TaxSplit {
  switch (supplyType) {
    case "INTRA_STATE": {
      const half = round2((taxableValue * (rate / 2)) / 100);
      return { cgst: half, sgst: half, igst: 0 };
    }
    case "INTER_STATE":
    case "EXPORT_WITH_TAX":
      return { cgst: 0, sgst: 0, igst: round2((taxableValue * rate) / 100) };
    case "EXPORT_LUT":
      return { cgst: 0, sgst: 0, igst: 0 };
  }
}

/** Whether an LUT declaration line must appear on the PDF. */
export function needsLutDeclaration(supplyType: SupplyType): boolean {
  return supplyType === "EXPORT_LUT";
}

export interface LineInput {
  qty: number;
  rate: number;     // unit price
  taxRate: number;  // e.g. 18, 0 for exports
}

export interface DiscountInput {
  type: "PERCENT" | "FLAT";
  value: number;
}

export interface InvoiceTotals {
  subtotal: number;       // sum of qty * rate before discount
  discount: number;       // absolute discount applied
  taxableValue: number;   // subtotal - discount
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;          // taxableValue + totalTax
  lines: Array<{
    lineSubtotal: number;
    lineDiscount: number;
    lineTaxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    lineTax: number;
    lineTotal: number;
  }>;
}

/**
 * Full invoice computation. Discount is applied proportionally across lines
 * BEFORE tax, which keeps mixed tax-rate invoices correct. Everything is
 * computed from inputs and rounded to paise — never trust a client-supplied total.
 */
export function computeInvoiceTotals(
  supplyType: SupplyType,
  items: LineInput[],
  discount: DiscountInput = { type: "PERCENT", value: 0 }
): InvoiceTotals {
  const lineSubtotals = items.map((i) => round2(i.qty * i.rate));
  const subtotal = round2(lineSubtotals.reduce((s, v) => s + v, 0));

  const totalDiscount =
    discount.type === "PERCENT"
      ? round2((subtotal * discount.value) / 100)
      : round2(Math.min(discount.value, subtotal));

  let cgst = 0,
    sgst = 0,
    igst = 0;

  const lines = items.map((item, idx) => {
    const lineSubtotal = lineSubtotals[idx];
    // proportional share of the discount (guard against divide-by-zero)
    const share = subtotal > 0 ? lineSubtotal / subtotal : 0;
    const lineDiscount = round2(totalDiscount * share);
    const lineTaxable = round2(lineSubtotal - lineDiscount);
    const split = computeTax(supplyType, lineTaxable, item.taxRate);
    const lineTax = round2(split.cgst + split.sgst + split.igst);
    cgst = round2(cgst + split.cgst);
    sgst = round2(sgst + split.sgst);
    igst = round2(igst + split.igst);
    return {
      lineSubtotal,
      lineDiscount,
      lineTaxable,
      cgst: split.cgst,
      sgst: split.sgst,
      igst: split.igst,
      lineTax,
      lineTotal: round2(lineTaxable + lineTax),
    };
  });

  const taxableValue = round2(subtotal - totalDiscount);
  const totalTax = round2(cgst + sgst + igst);
  return {
    subtotal,
    discount: totalDiscount,
    taxableValue,
    cgst,
    sgst,
    igst,
    totalTax,
    total: round2(taxableValue + totalTax),
    lines,
  };
}
