/**
 * AI helpers — provider-agnostic, same key-picking logic as lib/ai/extract-client.ts.
 * Falls back to template stubs when no AI key is configured.
 *
 * Provider priority (prefers free tiers):
 *   1. Google Gemini  — GEMINI_API_KEY (free at aistudio.google.com)
 *   2. Groq           — GROQ_API_KEY   (free at console.groq.com)
 *   3. Anthropic      — ANTHROPIC_API_KEY
 * Force a specific one with AI_PROVIDER=gemini|groq|anthropic.
 */

export interface AIProvider {
  readonly name: string;
  generateItemDescription(itemName: string): Promise<string>;
  draftEmail(kind: "invoice" | "quote" | "reminder", context: Record<string, string>): Promise<string>;
  suggestQuoteItems(brief: string): Promise<Array<{ name: string; rate: number }>>;
}

// ── Template fallback (no keys) ──────────────────────────────────────────────

class TemplateAI implements AIProvider {
  readonly name = "template-mock";

  async generateItemDescription(itemName: string): Promise<string> {
    return `Professional ${itemName.toLowerCase()} delivered to the highest production standards, including planning, execution, and one round of revisions.`;
  }

  async draftEmail(kind: "invoice" | "quote" | "reminder", ctx: Record<string, string>): Promise<string> {
    const who = ctx.clientName ?? "there";
    const doc = ctx.number ?? "";
    switch (kind) {
      case "invoice":
        return `Hi ${who},\n\nPlease find attached invoice ${doc}. Payment details are on the document. Let us know if you have any questions.\n\nThanks`;
      case "quote":
        return `Hi ${who},\n\nThanks for the opportunity. Attached is quotation ${doc} for your review. It's valid until the date noted on the document.\n\nBest`;
      case "reminder":
        return `Hi ${who},\n\nA gentle reminder that invoice ${doc} is awaiting payment. Please let us know if you need anything from our side.\n\nThanks`;
    }
  }

  async suggestQuoteItems(brief: string): Promise<Array<{ name: string; rate: number }>> {
    return [{ name: brief.slice(0, 60) || "Creative service", rate: 0 }];
  }
}

// ── Real LLM helpers ─────────────────────────────────────────────────────────

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
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

async function chat(system: string, user: string): Promise<string> {
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
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
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
        temperature: 0.4,
        max_tokens: 512,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return j.choices?.[0]?.message?.content ?? "";
  }

  // anthropic
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
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
  const start = candidate.indexOf("[") !== -1 && (candidate.indexOf("{") === -1 || candidate.indexOf("[") < candidate.indexOf("{"))
    ? candidate.indexOf("[")
    : candidate.indexOf("{");
  const end = start !== -1 && candidate[start] === "[" ? candidate.lastIndexOf("]") : candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(candidate.slice(start, end + 1)) as T; } catch { return null; }
}

// ── Real LLM-backed provider ─────────────────────────────────────────────────

class LlmAI implements AIProvider {
  readonly name: string;
  constructor(provider: Provider) { this.name = provider; }

  async generateItemDescription(itemName: string): Promise<string> {
    try {
      return (await chat(
        "You write concise, professional service descriptions for invoices. Output one paragraph, max 2 sentences. No Markdown.",
        `Write a description for this service item: "${itemName}"`
      )).trim();
    } catch {
      return new TemplateAI().generateItemDescription(itemName);
    }
  }

  async draftEmail(kind: "invoice" | "quote" | "reminder", ctx: Record<string, string>): Promise<string> {
    const kindLabel = kind === "invoice" ? "invoice" : kind === "quote" ? "quotation" : "payment reminder";
    const ctxStr = Object.entries(ctx).map(([k, v]) => `${k}: ${v}`).join("\n");
    try {
      return (await chat(
        `You draft short, professional ${kindLabel} emails for a business. Output ONLY the email body (no subject line, no Markdown). Sign off as the business, not as AI.`,
        `Draft a ${kindLabel} email with this context:\n${ctxStr}`
      )).trim();
    } catch {
      return new TemplateAI().draftEmail(kind, ctx);
    }
  }

  async suggestQuoteItems(brief: string): Promise<Array<{ name: string; rate: number }>> {
    try {
      const raw = await chat(
        `You suggest line items for a service quotation. Return a JSON array of objects with "name" (string) and "rate" (number, INR, 0 if unknown). Max 6 items. Output ONLY valid JSON, no Markdown.`,
        `Suggest line items for this project brief: "${brief.slice(0, 500)}"`
      );
      const parsed = parseJsonLoose<Array<{ name: string; rate: number }>>(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through */ }
    return new TemplateAI().suggestQuoteItems(brief);
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function getAI(): AIProvider {
  const provider = pickProvider();
  return provider ? new LlmAI(provider) : new TemplateAI();
}
