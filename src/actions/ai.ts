"use server";

import { requireOrg } from "@/lib/tenant";
import { extractClientInfo } from "@/lib/ai/extract-client";

// Country name (or code) -> the ISO codes the client form's <select> uses.
const COUNTRY_TO_ISO: Record<string, string> = {
  india: "IN",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  germany: "DE",
  uae: "AE",
  "united arab emirates": "AE",
  singapore: "SG",
  australia: "AU",
  canada: "CA",
};

const ISO_DEFAULT_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  DE: "EUR",
  AE: "AED",
  SG: "SGD",
  AU: "AUD",
  CA: "CAD",
};

// Indian state name -> GST state code (matches the form's <select>).
const INDIAN_STATE_TO_CODE: Record<string, string> = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  punjab: "03",
  chandigarh: "04",
  uttarakhand: "05",
  haryana: "06",
  delhi: "07",
  rajasthan: "08",
  "uttar pradesh": "09",
  bihar: "10",
  assam: "18",
  "west bengal": "19",
  jharkhand: "20",
  odisha: "21",
  chhattisgarh: "22",
  "madhya pradesh": "23",
  gujarat: "24",
  maharashtra: "27",
  karnataka: "29",
  goa: "30",
  kerala: "32",
  "tamil nadu": "33",
  telangana: "36",
  "andhra pradesh": "37",
};

const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];

export type ExtractedClient = {
  name: string;
  company: string;
  email: string;
  phone: string;
  billingAddress: string;
  country: string; // ISO code for the form
  stateCode: string; // GST code for the form ("" if not IN/unknown)
  gstin: string;
  defaultCurrency: string;
  notes: string;
};

export type ExtractResult =
  | { ok: true; fields: ExtractedClient; confidence: Record<string, number> }
  | { ok: false; error: string };

export async function extractClientFields(text: string): Promise<ExtractResult> {
  await requireOrg("MEMBER");
  const input = text.trim();
  if (input.length < 4) return { ok: false, error: "Paste some text containing the client's details first." };

  let raw;
  try {
    raw = await extractClientInfo(input);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const iso = raw.country ? COUNTRY_TO_ISO[raw.country.trim().toLowerCase()] ?? "" : "";
  const stateCode =
    iso === "IN" && raw.state ? INDIAN_STATE_TO_CODE[raw.state.trim().toLowerCase()] ?? "" : "";

  // Use the model's currency if we support it, else infer from country, else INR.
  const rawCcy = (raw.currency ?? "").trim().toUpperCase();
  const currency =
    (SUPPORTED_CURRENCIES.includes(rawCcy) && rawCcy) ||
    (iso && ISO_DEFAULT_CURRENCY[iso] && SUPPORTED_CURRENCIES.includes(ISO_DEFAULT_CURRENCY[iso]) ? ISO_DEFAULT_CURRENCY[iso] : "") ||
    "INR";

  // Prefer GSTIN; fall back to a generic taxId in the notes if present.
  const taxNote = !raw.gstin && raw.taxId ? `Tax ID: ${raw.taxId}` : "";
  const notes = [raw.notes ?? "", taxNote].filter(Boolean).join("\n");

  const fields: ExtractedClient = {
    name: raw.contactName ?? "",
    company: raw.company ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    billingAddress: raw.billingAddress ?? "",
    country: iso || "IN",
    stateCode,
    gstin: raw.gstin ?? "",
    defaultCurrency: currency,
    notes,
  };

  return { ok: true, fields, confidence: raw.confidence ?? {} };
}
