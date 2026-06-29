/**
 * Deterministic intent classifier — PURE, no I/O. Maps a user message (and
 * slash commands) to an intent + extracted args WITHOUT needing an LLM, so the
 * assistant's core features work even when no AI key is configured. The engine
 * falls back to the AI classifier only when this returns `unknown`.
 */

export type IntentName =
  | "pending"
  | "overdue"
  | "due"
  | "revenue"
  | "revenue_compare"
  | "invoice_stats"
  | "client_stats"
  | "quote_stats"
  | "top_outstanding"
  | "cashflow"
  | "client_search"
  | "report"
  | "reminders_who"
  | "insights"
  | "help"
  | "create_invoice"
  | "create_client"
  | "create_quote"
  | "mark_paid"
  | "send_reminders"
  | "unknown";

export type DueRange = "today" | "tomorrow" | "this_week" | "next_week" | "this_month";

export type MatchedIntent = {
  name: IntentName;
  args: {
    range?: DueRange;
    minAmount?: number;
    clientName?: string;
    invoiceNumber?: string;
  };
};

function parseAmount(text: string): number | undefined {
  // "above 50000", "over ₹50,000", "more than 1.5L", "2 lakh"
  const lakh = text.match(/(?:above|over|more than|greater than|>)\s*₹?\s*([\d.,]+)\s*(l|lakh|lakhs)/i);
  if (lakh) return Math.round(parseFloat(lakh[1].replace(/,/g, "")) * 100000);
  const m = text.match(/(?:above|over|more than|greater than|>)\s*₹?\s*([\d,]+(?:\.\d+)?)/i);
  if (m) return Math.round(parseFloat(m[1].replace(/,/g, "")));
  return undefined;
}

function parseDueRange(text: string): DueRange | undefined {
  if (/\btoday\b/.test(text)) return "today";
  if (/\btomorrow\b/.test(text)) return "tomorrow";
  if (/\bnext week\b/.test(text)) return "next_week";
  if (/\bthis week\b|\bdue this week\b|\bweek\b/.test(text)) return "this_week";
  if (/\bthis month\b|\bmonth\b/.test(text)) return "this_month";
  return undefined;
}

/** Strip a leading "create invoice for <X>" / "search client <X>" target phrase. */
function captureClientName(text: string): string | undefined {
  const m =
    text.match(/(?:invoice|quotation|quote|bill)\s+for\s+(.+)$/i) ||
    text.match(/(?:client|customer|find|search|show|lookup|look up)\s+(?:client\s+)?(?:named\s+)?(.+)$/i) ||
    text.match(/(?:for|to)\s+(.+)$/i);
  if (!m) return undefined;
  const name = m[1].trim().replace(/[.?!]+$/, "").trim();
  return name.length >= 1 ? name : undefined;
}

function captureInvoiceNumber(text: string): string | undefined {
  const m = text.match(/\b((?:INV[\/-]?)?[A-Z]{0,4}[\/-]?\d{1,4}[\/-]?\d{0,6})\b/i);
  return m ? m[1] : undefined;
}

const SLASH: Record<string, IntentName> = {
  "/pending": "pending",
  "/overdue": "overdue",
  "/due": "due",
  "/revenue": "revenue",
  "/report": "report",
  "/cashflow": "cashflow",
  "/reminders": "reminders_who",
  "/help": "help",
  "/insights": "insights",
  "/create invoice": "create_invoice",
  "/invoice": "create_invoice",
  "/new client": "create_client",
  "/client": "create_client",
  "/new quotation": "create_quote",
  "/quote": "create_quote",
};

export function classifyMessage(raw: string): MatchedIntent {
  const text = raw.trim();
  const lower = text.toLowerCase();

  // ── Slash commands ────────────────────────────────────────────────────────
  if (lower.startsWith("/")) {
    // longest-prefix match so "/create invoice" beats "/create"
    const key = Object.keys(SLASH)
      .filter((k) => lower === k || lower.startsWith(k + " "))
      .sort((a, b) => b.length - a.length)[0];
    if (key) {
      const rest = text.slice(key.length).trim();
      const name = SLASH[key];
      if (name === "create_invoice" || name === "create_quote" || name === "create_client") {
        return { name, args: { clientName: rest || undefined } };
      }
      if (name === "due") return { name, args: { range: parseDueRange(lower) ?? "this_week" } };
      return { name, args: {} };
    }
  }

  // ── Write intents (checked early; they contain action verbs) ───────────────
  if (/\b(create|make|new|generate|raise|draft)\b.*\b(invoice|bill)\b/.test(lower) || /\binvoice\b.*\bfor\b/.test(lower)) {
    return { name: "create_invoice", args: { clientName: captureClientName(text) } };
  }
  if (/\b(create|add|new)\b.*\b(client|customer)\b/.test(lower)) {
    return { name: "create_client", args: { clientName: captureClientName(text) } };
  }
  if (/\b(create|make|new|generate)\b.*\b(quotation|quote)\b/.test(lower)) {
    return { name: "create_quote", args: { clientName: captureClientName(text) } };
  }
  if (/\bmark\b.*\b(paid|settled)\b|\bpaid\b.*\binvoice\b|\brecord (a )?payment\b/.test(lower)) {
    return { name: "mark_paid", args: { invoiceNumber: captureInvoiceNumber(text) } };
  }
  if (/\bsend\b.*\b(reminder|reminders|follow[- ]?up)\b|\bremind\b.*\b(client|overdue|unpaid)\b|\bemail\b.*\b(overdue|unpaid|pending)\b/.test(lower)) {
    return { name: "send_reminders", args: {} };
  }

  // ── Read intents ───────────────────────────────────────────────────────────
  if (/\bwho\b.*\b(owe|owes|outstanding)\b|\b(top|highest|most)\b.*\b(owe|owes|outstanding|due)\b|\bowes? (me )?the most\b/.test(lower)) {
    return { name: "top_outstanding", args: {} };
  }
  if (/\boverdue\b/.test(lower)) return { name: "overdue", args: { minAmount: parseAmount(lower) } };
  if (/\b(due|due date|payable)\b/.test(lower) && !/overdue/.test(lower)) {
    return { name: "due", args: { range: parseDueRange(lower) ?? "this_week", minAmount: parseAmount(lower) } };
  }
  if (/\b(pending|unpaid|outstanding|receivable|receivables|to be paid|owed to me)\b/.test(lower) && !/client/.test(lower)) {
    return { name: "pending", args: { minAmount: parseAmount(lower) } };
  }
  if (/\b(compare|vs|versus|growth|grew|increase|change)\b.*\b(revenue|income|month|sales)\b|\brevenue\b.*\b(last month|previous month|compare)\b/.test(lower)) {
    return { name: "revenue_compare", args: {} };
  }
  if (/\b(revenue|income|earnings|sales|turnover|received|collected)\b/.test(lower)) {
    return { name: "revenue", args: {} };
  }
  if (/\b(cash ?flow|receivables|projected|projection|upcoming payment)\b/.test(lower)) {
    return { name: "cashflow", args: {} };
  }
  if (/\b(quotation|quote|quotes)\b/.test(lower)) return { name: "quote_stats", args: {} };
  if (/\b(how many|number of|count|total)\b.*\binvoice/.test(lower) || /\binvoice (stats|status|summary|breakdown)\b/.test(lower)) {
    return { name: "invoice_stats", args: {} };
  }
  if (/\b(client|customer)s?\b/.test(lower)) {
    const name = captureClientName(text);
    // "how many clients" / "client stats" → aggregate; otherwise a name lookup
    if (/\b(how many|number of|count|total|active|new|stats|summary)\b/.test(lower) || !name) {
      return { name: "client_stats", args: {} };
    }
    return { name: "client_search", args: { clientName: name } };
  }
  if (/\b(report|analytics|kpi|overview|dashboard|summary)\b/.test(lower)) return { name: "report", args: {} };
  if (/\b(follow ?up|who should i|remind me)\b/.test(lower)) return { name: "reminders_who", args: {} };
  if (/\b(help|what can you|capabilities|commands)\b/.test(lower)) return { name: "help", args: {} };
  if (lower === "__insights__") return { name: "insights", args: {} };

  return { name: "unknown", args: {} };
}
