import "server-only";

/**
 * Provider-agnostic extraction of client/billing fields from unstructured text
 * (emails, WhatsApp, invoices, signatures). Calls a chat LLM via REST — no SDK.
 *
 * Provider auto-selection (prefers free tiers), or force with AI_PROVIDER:
 *   1. Google Gemini  — GEMINI_API_KEY (free tier at aistudio.google.com)
 *   2. Groq           — GROQ_API_KEY   (free tier at console.groq.com)
 *   3. Anthropic      — ANTHROPIC_API_KEY (paid)
 * Optional model overrides: GEMINI_MODEL, GROQ_MODEL, ANTHROPIC_MODEL.
 */

const DEFAULTS = {
  gemini: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  anthropic: "claude-haiku-4-5-20251001",
};

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

type Provider = "gemini" | "groq" | "anthropic";

function pickProvider(): Provider | null {
  const forced = (process.env.AI_PROVIDER || "").toLowerCase() as Provider;
  if (forced === "gemini" || forced === "groq" || forced === "anthropic") return forced;
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

const TIMEOUT = 20_000;

async function callGemini(text: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY!;
  const model = process.env.GEMINI_MODEL || DEFAULTS.gemini;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: text.slice(0, 8000) }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    }
  );
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

async function callGroq(text: string): Promise<string> {
  const key = process.env.GROQ_API_KEY!;
  const model = process.env.GROQ_MODEL || DEFAULTS.groq;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text.slice(0, 8000) },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(text: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANTHROPIC_MODEL || DEFAULTS.anthropic;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text.slice(0, 8000) }],
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

export async function extractClientInfo(text: string): Promise<RawExtraction> {
  const provider = pickProvider();
  if (!provider) {
    throw new Error(
      "AI is not configured. Add a free GEMINI_API_KEY (aistudio.google.com) or GROQ_API_KEY (console.groq.com)."
    );
  }
  const out =
    provider === "gemini" ? await callGemini(text) : provider === "groq" ? await callGroq(text) : await callAnthropic(text);
  const parsed = parseJsonLoose(out);
  if (!parsed) throw new Error("Could not parse the AI response. Try again or fill the form manually.");
  return parsed;
}
