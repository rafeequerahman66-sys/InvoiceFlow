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

/** Prisma Decimal -> number for display/compute. Safe for invoice-scale values. */
export function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  return Number(d.toString());
}
