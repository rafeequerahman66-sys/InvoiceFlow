const LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  AED: "ar-AE",
};

export const CURRENCIES = Object.keys(LOCALES);

export function formatMoney(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat(LOCALES[currency] ?? "en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

/**
 * PDF-safe money formatting. The standard PDF font (Helvetica) used by
 * @react-pdf/renderer has no glyph for the Indian Rupee sign ₹ (U+20B9), so it
 * renders as a broken mark. Swap it for "Rs." — every other currency symbol
 * ($, €, £, ¥) is in WinAnsi and renders fine, so they pass through unchanged.
 */
export function formatMoneyPdf(amount: number, currency = "INR"): string {
  return formatMoney(amount, currency).replace(/₹\s*/g, "Rs. ");
}

/** Prisma Decimal -> number for display/compute. Safe for invoice-scale values. */
export function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  return Number(d.toString());
}
