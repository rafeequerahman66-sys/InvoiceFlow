import "server-only";

/**
 * AI layer for the assistant — same provider-agnostic, free-tier-first pattern
 * as src/lib/integrations/ai.ts (Gemini → Groq → Anthropic), but adds:
 *   • aiClassify()      — pick an intent from a paraphrased question (JSON mode)
 *   • aiExtractItems()  — parse invoice line items from free text (JSON mode)
 *   • aiAnswer()        — a short natural-language reply for off-catalog questions
 *
 * Everything degrades gracefully: when no key is set, aiAvailable() is false and
 * the engine relies entirely on the deterministic classifier.
 */

type Provider = "gemini" | "groq" | "anthropic";

function pickProvider(): Provider | null {
  const forced = (process.env.AI_PROVIDER || "").toLowerCase() as Provider;
  if (forced === "gemini" || forced === "groq" || forced === "anthropic") return forced;
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function aiAvailable(): boolean {
  return pickProvider() !== null;
}

const TIMEOUT = 18_000;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

async function chat(system: string, user: string, maxTokens = 400): Promise<string> {
  const provider = pickProvider();
  if (!provider) throw new Error("no-provider");

  if (provider === "gemini") {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY!;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
        }),
        signal: AbortSignal.timeout(TIMEOUT),
      }
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const j = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  }

  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return j.choices?.[0]?.message?.content ?? "";
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const j = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return (j.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

function parseJsonLoose<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start =
    candidate.indexOf("[") !== -1 && (candidate.indexOf("{") === -1 || candidate.indexOf("[") < candidate.indexOf("{"))
      ? candidate.indexOf("[")
      : candidate.indexOf("{");
  const end = start !== -1 && candidate[start] === "[" ? candidate.lastIndexOf("]") : candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

const INTENT_LIST = [
  "pending", "overdue", "due", "revenue", "revenue_compare", "invoice_stats",
  "client_stats", "quote_stats", "top_outstanding", "cashflow", "client_search",
  "report", "reminders_who", "create_invoice", "create_client", "send_reminders", "help", "unknown",
] as const;

export type AiIntent = { intent: string; clientName?: string; range?: string; minAmount?: number };

/** Classify a paraphrased question into one of the known intents. Null on any failure. */
export async function aiClassify(message: string): Promise<AiIntent | null> {
  if (!pickProvider()) return null;
  const system = `You route a finance assistant. Given the user's message, return ONLY JSON:
{"intent": one of [${INTENT_LIST.join(", ")}], "clientName"?: string, "range"?: "today"|"tomorrow"|"this_week"|"next_week"|"this_month", "minAmount"?: number}
Rules: choose the single best intent. "client_search" needs a clientName. "due" needs a range. If nothing fits, intent="unknown". No prose, JSON only.`;
  try {
    const raw = await chat(system, message, 120);
    const parsed = parseJsonLoose<AiIntent>(raw);
    if (parsed && typeof parsed.intent === "string" && INTENT_LIST.includes(parsed.intent as (typeof INTENT_LIST)[number])) {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export type AiItem = { name: string; qty: number; rate: number; taxRate?: number };

/** Extract invoice line items from natural language. Empty array on failure. */
export async function aiExtractItems(text: string): Promise<AiItem[]> {
  if (!pickProvider()) return [];
  const system = `Extract invoice line items from the text. Return ONLY a JSON array:
[{"name": string, "qty": number, "rate": number, "taxRate": number}]
"rate" is the per-unit price in the invoice currency (a number, no symbols). "qty" defaults to 1. "taxRate" defaults to 18 (GST %). Max 12 items. JSON only, no prose.`;
  try {
    const raw = await chat(system, text.slice(0, 800), 400);
    const parsed = parseJsonLoose<AiItem[]>(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((i) => i && typeof i.name === "string" && i.name.trim())
        .map((i) => ({
          name: String(i.name).slice(0, 200).trim(),
          qty: Number(i.qty) > 0 ? Number(i.qty) : 1,
          rate: Number(i.rate) >= 0 ? Number(i.rate) : 0,
          taxRate: Number(i.taxRate) >= 0 && Number(i.taxRate) <= 28 ? Number(i.taxRate) : 18,
        }));
    }
  } catch {
    /* fall through */
  }
  return [];
}

/** Short, friendly natural-language answer for questions outside the tool catalog. */
export async function aiAnswer(message: string, contextSummary: string): Promise<string | null> {
  if (!pickProvider()) return null;
  const system = `You are the AI finance manager inside InvoiceFlow, an invoicing & GST app for Indian businesses. Answer in 1-3 short sentences, friendly and concrete. You CANNOT see data beyond the context provided. If the user asks for data you don't have, tell them which assistant command to use (e.g. "ask: overdue invoices"). Never invent numbers.`;
  try {
    const reply = await chat(system, `Context:\n${contextSummary}\n\nUser: ${message}`, 250);
    return reply.trim() || null;
  } catch {
    return null;
  }
}
