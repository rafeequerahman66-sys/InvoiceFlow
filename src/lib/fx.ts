/**
 * Exchange-rate lookup for export invoices. Stored on the invoice at issue time
 * so the INR book value is fixed and reproducible for GST returns.
 *
 * Default implementation hits a free public API. Swap in your preferred source
 * (RBI reference rate, your bank's rate, etc.) — the contract is just
 * (from, to, date?) => number.
 */
export async function getFxRateToInr(currency: string, _date?: Date): Promise<number> {
  if (currency === "INR") return 1;
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${currency}&to=INR`, {
      next: { revalidate: 60 * 60 }, // cache an hour
    });
    if (!res.ok) throw new Error(`fx ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.INR;
    if (!rate) throw new Error("no INR rate");
    return rate;
  } catch {
    // Fallback approximations — replace with a reliable source before relying on books.
    const fallback: Record<string, number> = { USD: 84, EUR: 91, GBP: 106, AED: 23 };
    return fallback[currency] ?? 1;
  }
}
