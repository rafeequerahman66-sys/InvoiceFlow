import "server-only";

/**
 * Claude-backed extraction of client/billing fields from unstructured text
 * (emails, WhatsApp, invoices, signatures). Calls the Anthropic Messages API
 * via REST — no SDK, mirroring the Resend integration.
 *
 * Env: ANTHROPIC_API_KEY (required). ANTHROPIC_MODEL optionally overrides the
 * default (Claude Haiku 4.5 — cheap + fast, ample for structured extraction).
 */

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export type RawExtraction = {
  contactName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  country: string | null;
  state: string | null;
  currency: string | null;
  gstin: string | null;
  taxId: string | null;
  notes: string | null;
  confidence: Record<string, number>;
};

const SYSTEM_PROMPT = `You are an AI assistant responsible for extracting client billing information from unstructured text and automatically filling a "New Client" form. The user will paste emails, WhatsApp messages, invoices, contracts, signatures, or any text containing client information. Your task is to accurately identify and extract the required fields.

Return ONLY valid JSON in exactly this shape:
{
  "contactName": null,
  "company": null,
  "email": null,
  "phone": null,
  "billingAddress": null,
  "country": null,
  "state": null,
  "currency": null,
  "gstin": null,
  "taxId": null,
  "notes": null,
  "confidence": { "contactName": 0, "company": 0, "email": 0, "phone": 0, "billingAddress": 0, "country": 0, "state": 0, "currency": 0, "gstin": 0, "taxId": 0 }
}

Extraction rules:
- contactName: the primary contact person's full name. Never a company name.
- company: the legal business name (e.g. "Zo World Pvt Ltd"). Ignore marketing names unless clearly the company.
- email: the billing/business email; prefer finance@/accounts@/hello@ over personal emails unless only a personal one exists.
- phone: international format where possible (e.g. "+91 9876543210").
- billingAddress: the complete address as one string (building, street, area, city, state, postal code, country). Preserve formatting.
- country: derive from the address (e.g. India, United States, United Kingdom, Singapore, UAE, Australia, Canada, Germany). null if unknown.
- state: the state/province (e.g. Karnataka, Kerala, California, Dubai, Ontario).
- currency: infer from country — India→INR, United States→USD, United Kingdom→GBP, EU→EUR, Singapore→SGD, UAE→AED, Australia→AUD, Canada→CAD, Japan→JPY. null if uncertain.
- gstin: Indian GST number (15 chars). Only return if explicitly present. Never guess.
- taxId: other tax registration (VAT/EIN/TIN/ABN). Only the value.
- notes: useful billing instructions that don't fit other fields (e.g. "Payment terms: Net 30", "PO required").
- confidence: 0-100 per field. 100=explicitly stated, 90=very likely, 70=inferred, 40=weak guess, 0=missing.

Rules: Never invent information. Never hallucinate company names. Never guess GST numbers. Missing => null. Ignore greetings/signatures unless they contain useful contact info. If multiple companies appear, choose the one clearly being billed. Preserve capitalization, GSTIN/Tax IDs, emails, and phone numbers exactly. Trim spaces. Output ONLY valid JSON — no Markdown, no code fences, no explanations.`;

function parseJsonLoose(text: string): RawExtraction | null {
  // The model is told to return bare JSON, but strip fences/prose defensively.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as RawExtraction;
  } catch {
    return null;
  }
}

export async function extractClientInfo(text: string): Promise<RawExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("AI is not configured. Add ANTHROPIC_API_KEY to enable the billing assistant.");
  }
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text.slice(0, 8000) }],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const textOut = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  const parsed = parseJsonLoose(textOut);
  if (!parsed) throw new Error("Could not parse the AI response. Try again or fill the form manually.");
  return parsed;
}
