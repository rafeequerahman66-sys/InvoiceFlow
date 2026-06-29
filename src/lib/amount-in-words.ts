/**
 * Number → words using the Indian numbering system (lakh / crore), for the
 * "Total (in words)" line on invoices. Pure, dependency-free.
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? ONES[h] + " Hundred" + (r ? " " : "") : "") + (r ? twoDigits(r) : "");
}

/** Integer → words, Indian grouping (crore/lakh/thousand/hundred). */
export function numberToWordsIndian(num: number): string {
  if (num === 0) return "Zero";
  let n = Math.floor(Math.abs(num));
  let out = "";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;
  if (crore) out += (crore > 99 ? numberToWordsIndian(crore) : twoDigits(crore)) + " Crore ";
  if (lakh) out += twoDigits(lakh) + " Lakh ";
  if (thousand) out += twoDigits(thousand) + " Thousand ";
  if (hundred) out += threeDigits(hundred);
  return out.trim();
}

const UNITS: Record<string, { major: string; minor: string }> = {
  INR: { major: "Rupees", minor: "Paise" },
  USD: { major: "Dollars", minor: "Cents" },
  EUR: { major: "Euros", minor: "Cents" },
  GBP: { major: "Pounds", minor: "Pence" },
  AED: { major: "Dirhams", minor: "Fils" },
};

/** e.g. amountInWords(5900, "INR") → "Five Thousand Nine Hundred Rupees Only". */
export function amountInWords(amount: number, currency = "INR"): string {
  const unit = UNITS[currency] ?? { major: currency, minor: "" };
  const major = Math.floor(amount);
  const minor = Math.round((amount - major) * 100);
  let s = `${numberToWordsIndian(major)} ${unit.major}`;
  if (minor > 0 && unit.minor) s += ` and ${numberToWordsIndian(minor)} ${unit.minor}`;
  return `${s} Only`;
}
