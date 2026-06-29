import "server-only";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { resolveSupplyType, computeInvoiceTotals, type SupplyType } from "@/lib/tax";
import { computeKpis, revenueByMonth, topClients } from "@/lib/reports";
import { classifyMessage, type IntentName, type DueRange } from "./intents";
import { aiClassify, aiExtractItems, aiAnswer, aiAvailable, type AiItem } from "./provider";
import {
  getOpenInvoices,
  getReminderSentSet,
  getReportInvoices,
  getInvoiceStatusCounts,
  getQuoteStatusCounts,
  getClientStats,
  findClients,
  getClientDetail,
  getMonthlyCollected,
  dueLabel,
  type OpenInvoice,
} from "./queries";
import type { AssistantBlock, AssistantTurn, Flow, InvoiceRow, AssistantRequest } from "./types";

export type AssistantCtx = { orgId: string; userId: string; role: string; orgName: string };

const INR = (n: number) => formatMoney(n, "INR");

function toInvoiceRow(inv: OpenInvoice, now: Date, reminderSent?: Set<string>): InvoiceRow {
  return {
    id: inv.id,
    number: inv.number,
    client: inv.clientName,
    amount: inv.outstanding,
    currency: inv.currency,
    status: inv.status,
    dueLabel: dueLabel(inv.dueDate, now),
    reminderSent: reminderSent ? reminderSent.has(inv.id) : undefined,
  };
}

const DEFAULT_SUGGESTIONS = ["Overdue invoices", "How much is pending?", "This month's revenue", "Who owes the most?"];

// ── Item parsing fallback (no AI key) ────────────────────────────────────────
function parseMoneyToken(s: string): number | null {
  const m = s.match(/₹?\s*([\d,]+(?:\.\d+)?)\s*(k|l|lakh|lakhs)?/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(n)) return null;
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k") n *= 1000;
  else if (unit.startsWith("l")) n *= 100000;
  return Math.round(n);
}

/** Extract a qty marker like "x5" / "5 reels" / "qty 3" from a name fragment. */
function extractQty(name: string): { name: string; qty: number } {
  const qm = name.match(/x\s*(\d+)\b|\bqty\s*(\d+)\b|\b(\d+)\s+(?:reels?|units?|nos|pcs|pieces|videos?|posts?|hours?|days?|months?)\b/i);
  const qty = qm ? Number(qm[1] || qm[2] || qm[3]) || 1 : 1;
  const cleaned = name.replace(/x\s*\d+\b|\bqty\s*\d+\b/gi, "").replace(/[-–:]+\s*$/, "").trim();
  return { name: cleaned || name.trim(), qty };
}

function parseItemsFallback(text: string): AiItem[] {
  const lines = text.split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);
  const out: AiItem[] = [];
  for (const raw of lines) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    let name = raw;
    let qty = 1;
    let rate = 0;

    if (parts.length >= 3) {
      // "Name, qty, rate" — the format we instruct users to use.
      name = parts[0];
      const q = parseInt(parts[1].replace(/[^\d]/g, ""), 10);
      if (q > 0) qty = q;
      rate = parseMoneyToken(parts[parts.length - 1]) ?? 0;
    } else if (parts.length === 2) {
      // "Name, rate" (name may carry an inline qty like "Reels x5").
      name = parts[0];
      rate = parseMoneyToken(parts[1]) ?? 0;
    } else {
      // Single segment: take a trailing amount as the rate.
      const rs = raw.match(/₹\s*([\d,]+(?:\.\d+)?)\s*(k|l|lakh|lakhs)?/i) || raw.match(/([\d,]+(?:\.\d+)?)\s*(k|l|lakh|lakhs)?\s*$/i);
      if (rs) {
        rate = parseMoneyToken(rs[0]) ?? 0;
        name = raw.replace(rs[0], "").trim();
      }
    }

    const q = extractQty(name);
    name = q.name;
    if (qty === 1 && q.qty > 1) qty = q.qty;
    if (!name) name = "Service";
    out.push({ name: name.slice(0, 200), qty, rate, taxRate: 18 });
  }
  return out.filter((i) => i.name);
}

function dueInRange(inv: OpenInvoice, range: DueRange, now: Date): boolean {
  const d = inv.daysToDue;
  switch (range) {
    case "today":
      return d === 0;
    case "tomorrow":
      return d === 1;
    case "this_week":
      return d >= 0 && d <= 7;
    case "next_week":
      return d > 7 && d <= 14;
    case "this_month":
      return d >= 0 && inv.dueDate.getUTCMonth() === now.getUTCMonth() && inv.dueDate.getUTCFullYear() === now.getUTCFullYear();
  }
}

// ── Main entry ────────────────────────────────────────────────────────────────
export async function runAssistant(ctx: AssistantCtx, req: AssistantRequest): Promise<AssistantTurn> {
  const now = new Date();
  const message = (req.message || "").trim();

  // 1. Continue an in-progress multi-turn flow — UNLESS the user explicitly
  //    breaks out with a slash command or a cancel word. Without this, a stale
  //    flow (e.g. "create invoice → which client?") would swallow the next
  //    command as if it were the answer.
  if (req.flow) {
    const lower = message.toLowerCase();
    if (/^(cancel|stop|nevermind|never mind|forget it|abort|reset)\b/.test(lower)) {
      return { text: "Okay, cancelled. What else can I help with?", blocks: [], flow: null, suggestions: DEFAULT_SUGGESTIONS };
    }
    if (!lower.startsWith("/")) {
      const cont = await continueFlow(ctx, req.flow, message, now);
      if (cont) return cont;
    }
    // Slash command mid-flow: drop the flow and classify fresh below.
  }

  // 2. Deterministic classification.
  let matched = classifyMessage(message);

  // 3. AI fallback when deterministic routing is unsure.
  if (matched.name === "unknown" && aiAvailable()) {
    const ai = await aiClassify(message);
    if (ai && ai.intent !== "unknown") {
      matched = {
        name: ai.intent as IntentName,
        args: { clientName: ai.clientName, range: ai.range as DueRange | undefined, minAmount: ai.minAmount },
      };
    }
  }

  return handleIntent(ctx, matched.name, matched.args, message, now);
}

async function handleIntent(
  ctx: AssistantCtx,
  name: IntentName,
  args: { range?: DueRange; minAmount?: number; clientName?: string; invoiceNumber?: string },
  message: string,
  now: Date
): Promise<AssistantTurn> {
  const { orgId } = ctx;

  switch (name) {
    case "pending": {
      const open = await getOpenInvoices(orgId, now);
      const totalOut = open.reduce((s, i) => s + i.outstandingInr, 0);
      const overdue = open.filter((i) => i.daysToDue < 0);
      const oldest = open.slice().sort((a, b) => a.daysToDue - b.daysToDue)[0];
      const largest = open.slice().sort((a, b) => b.outstandingInr - a.outstandingInr)[0];
      const top = open.slice().sort((a, b) => b.outstandingInr - a.outstandingInr).slice(0, 6);
      const blocks: AssistantBlock[] = [
        {
          kind: "stat",
          title: "Pending Collections",
          value: INR(totalOut),
          caption: `${open.length} unpaid invoice${open.length === 1 ? "" : "s"}`,
          items: [
            { label: "Overdue", value: `${overdue.length}` },
            { label: "Oldest due", value: oldest ? dueLabel(oldest.dueDate, now) : "—" },
            { label: "Largest due", value: largest ? `${largest.clientName} · ${INR(largest.outstandingInr)}` : "—" },
          ],
        },
      ];
      if (top.length) blocks.push({ kind: "invoices", title: "Largest outstanding", rows: top.map((i) => toInvoiceRow(i, now)) });
      return {
        text: open.length ? `You have ${INR(totalOut)} pending across ${open.length} invoice${open.length === 1 ? "" : "s"}.` : "Nothing pending — every issued invoice is paid. 🎉",
        blocks: open.length ? blocks : [],
        suggestions: ["Overdue invoices", "Send reminders", "This month's revenue"],
      };
    }

    case "overdue": {
      const open = await getOpenInvoices(orgId, now);
      let overdue = open.filter((i) => i.daysToDue < 0);
      if (args.minAmount) overdue = overdue.filter((i) => i.totalInr >= args.minAmount!);
      overdue.sort((a, b) => a.daysToDue - b.daysToDue);
      const ids = overdue.map((i) => i.id);
      const sent = await getReminderSentSet(orgId, ids);
      const total = overdue.reduce((s, i) => s + i.outstandingInr, 0);
      return {
        text: overdue.length
          ? `${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} totalling ${INR(total)}.`
          : "No overdue invoices — you're all caught up.",
        blocks: overdue.length
          ? [{ kind: "invoices", title: "Overdue Invoices", rows: overdue.map((i) => toInvoiceRow(i, now, sent)) }]
          : [],
        suggestions: overdue.length ? ["Send reminders", "Who owes the most?"] : DEFAULT_SUGGESTIONS,
      };
    }

    case "due": {
      const range = args.range ?? "this_week";
      const open = await getOpenInvoices(orgId, now);
      let rows = open.filter((i) => dueInRange(i, range, now));
      if (args.minAmount) rows = rows.filter((i) => i.totalInr >= args.minAmount!);
      rows.sort((a, b) => a.daysToDue - b.daysToDue);
      const label = { today: "due today", tomorrow: "due tomorrow", this_week: "due this week", next_week: "due next week", this_month: "due this month" }[range];
      return {
        text: rows.length ? `${rows.length} invoice${rows.length === 1 ? "" : "s"} ${label}.` : `Nothing ${label}.`,
        blocks: rows.length ? [{ kind: "invoices", title: `Invoices ${label}`, rows: rows.map((i) => toInvoiceRow(i, now)) }] : [],
        suggestions: ["Overdue invoices", "How much is pending?"],
      };
    }

    case "revenue": {
      const reportInvoices = await getReportInvoices(orgId);
      const points = revenueByMonth(reportInvoices, now, 6);
      const { thisMonth, lastMonth } = await getMonthlyCollected(orgId, now);
      const delta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
      return {
        text: `You've collected ${INR(thisMonth)} this month${delta !== null ? ` (${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs last month)` : ""}.`,
        blocks: [
          { kind: "stat", title: "Revenue This Month", value: INR(thisMonth), caption: "collected", tone: delta !== null && delta < 0 ? "negative" : "positive" },
          { kind: "bars", title: "Last 6 months", points, currency: "INR" },
        ],
        suggestions: ["Compare with last month", "Pending collections", "Top clients"],
      };
    }

    case "revenue_compare": {
      const { thisMonth, lastMonth } = await getMonthlyCollected(orgId, now);
      const delta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
      return {
        text:
          delta === null
            ? `You collected ${INR(thisMonth)} this month. No revenue last month to compare against.`
            : `Revenue is ${delta >= 0 ? "up" : "down"} ${Math.abs(delta).toFixed(0)}% — ${INR(thisMonth)} this month vs ${INR(lastMonth)} last month.`,
        blocks: [
          {
            kind: "compare",
            title: "This month vs last month",
            a: { label: "This month", value: thisMonth },
            b: { label: "Last month", value: lastMonth },
            deltaPct: delta,
            currency: "INR",
          },
        ],
        suggestions: ["This month's revenue", "Cash flow"],
      };
    }

    case "invoice_stats": {
      const counts = await getInvoiceStatusCounts(orgId);
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      return {
        text: `You have ${total} invoice${total === 1 ? "" : "s"} in total.`,
        blocks: [
          {
            kind: "stat",
            title: "Invoices",
            value: `${total}`,
            caption: "all time",
            items: [
              { label: "Paid", value: `${counts.PAID ?? 0}` },
              { label: "Sent", value: `${(counts.SENT ?? 0) + (counts.PARTIALLY_PAID ?? 0)}` },
              { label: "Overdue", value: `${counts.OVERDUE ?? 0}` },
              { label: "Draft", value: `${counts.DRAFT ?? 0}` },
              { label: "Cancelled", value: `${counts.CANCELLED ?? 0}` },
            ],
          },
        ],
        suggestions: ["How much is pending?", "Overdue invoices"],
      };
    }

    case "client_stats": {
      const s = await getClientStats(orgId, now);
      return {
        text: `You have ${s.total} client${s.total === 1 ? "" : "s"}. ${s.withPending} ha${s.withPending === 1 ? "s" : "ve"} unpaid invoices.${s.topClient ? ` Top client: ${s.topClient.name}.` : ""}`,
        blocks: [
          {
            kind: "stat",
            title: "Clients",
            value: `${s.total}`,
            caption: `${s.newThisMonth} new this month`,
            items: [
              { label: "With pending", value: `${s.withPending}` },
              { label: "Top by billing", value: s.topClient ? `${s.topClient.name} · ${INR(s.topClient.billed)}` : "—" },
            ],
          },
        ],
        suggestions: ["Who owes the most?", "Find a client"],
      };
    }

    case "quote_stats": {
      const counts = await getQuoteStatusCounts(orgId);
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      const converted = (counts.CONVERTED ?? 0) + (counts.ACCEPTED ?? 0);
      const issued = total - (counts.DRAFT ?? 0);
      const rate = issued > 0 ? (converted / issued) * 100 : 0;
      return {
        text: `You have ${total} quotation${total === 1 ? "" : "s"} with a ${rate.toFixed(0)}% conversion rate.`,
        blocks: [
          {
            kind: "stat",
            title: "Quotations",
            value: `${total}`,
            caption: `${rate.toFixed(0)}% conversion`,
            items: [
              { label: "Accepted", value: `${counts.ACCEPTED ?? 0}` },
              { label: "Converted", value: `${counts.CONVERTED ?? 0}` },
              { label: "Sent", value: `${counts.SENT ?? 0}` },
              { label: "Rejected", value: `${counts.REJECTED ?? 0}` },
            ],
          },
          { kind: "links", items: [{ label: "New quotation", href: "/quotations/new" }, { label: "All quotations", href: "/quotations" }] },
        ],
        suggestions: ["This month's revenue", "Pending collections"],
      };
    }

    case "top_outstanding": {
      const open = await getOpenInvoices(orgId, now);
      const byClient = new Map<string, number>();
      for (const i of open) byClient.set(i.clientName, (byClient.get(i.clientName) ?? 0) + i.outstandingInr);
      const rows = [...byClient.entries()]
        .map(([name, outstanding]) => ({ id: name, name, outstanding }))
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 6);
      return {
        text: rows.length ? `${rows[0].name} owes the most — ${INR(rows[0].outstanding)}.` : "No outstanding balances right now.",
        blocks: rows.length ? [{ kind: "clients", title: "Top Outstanding Clients", rows }] : [],
        suggestions: ["Send reminders", "Overdue invoices"],
      };
    }

    case "cashflow": {
      const open = await getOpenInvoices(orgId, now);
      const receivables = open.reduce((s, i) => s + i.outstandingInr, 0);
      const overdue = open.filter((i) => i.daysToDue < 0).reduce((s, i) => s + i.outstandingInr, 0);
      const next30 = open.filter((i) => i.daysToDue >= 0 && i.daysToDue <= 30).reduce((s, i) => s + i.outstandingInr, 0);
      const { thisMonth, lastMonth } = await getMonthlyCollected(orgId, now);
      return {
        text: `Receivables stand at ${INR(receivables)} — ${INR(overdue)} overdue, ${INR(next30)} due within 30 days.`,
        blocks: [
          {
            kind: "stat",
            title: "Cash Flow",
            value: INR(receivables),
            caption: "total receivables",
            items: [
              { label: "Overdue", value: INR(overdue) },
              { label: "Due ≤ 30 days", value: INR(next30) },
              { label: "Collected this month", value: INR(thisMonth) },
              { label: "Collected last month", value: INR(lastMonth) },
            ],
          },
        ],
        suggestions: ["Who owes the most?", "This month's revenue"],
      };
    }

    case "report": {
      const reportInvoices = await getReportInvoices(orgId);
      const kpis = computeKpis(reportInvoices, now);
      const tc = topClients(reportInvoices, 5).map((c) => ({ id: c.name, name: c.name, billed: c.total }));
      return {
        text: `FY revenue ${INR(kpis.revenueFY)}, GST collected ${INR(kpis.gstCollected)}, ${(kpis.collectionRate * 100).toFixed(0)}% collection rate.`,
        blocks: [
          {
            kind: "stat",
            title: "Financial Snapshot",
            value: INR(kpis.revenueFY),
            caption: "revenue this FY",
            items: [
              { label: "GST collected", value: INR(kpis.gstCollected) },
              { label: "Avg invoice", value: INR(kpis.avgInvoice) },
              { label: "Collection rate", value: `${(kpis.collectionRate * 100).toFixed(0)}%` },
            ],
          },
          ...(tc.length ? [{ kind: "clients" as const, title: "Top Clients (billed)", rows: tc }] : []),
          { kind: "links", items: [{ label: "Open full reports", href: "/reports" }] },
        ],
        suggestions: ["This month's revenue", "Pending collections"],
      };
    }

    case "client_search": {
      const q = (args.clientName || message).trim();
      if (!q) return { text: "Which client are you looking for? Tell me a name.", blocks: [] };
      const matches = await findClients(orgId, q, 6);
      if (matches.length === 0) {
        return {
          text: `No client matches "${q}". Want to add them?`,
          blocks: [{ kind: "links", items: [{ label: `Add "${q}" as a client`, href: "/clients/new" }] }],
          suggestions: ["Add a client", "Show all clients"],
        };
      }
      if (matches.length === 1) {
        const detail = await getClientDetail(orgId, matches[0].id, now);
        if (detail) {
          const fields = [
            { label: "Outstanding", value: INR(detail.outstandingInr) },
            { label: "Invoices", value: `${detail.invoiceCount} (${detail.paidCount} paid)` },
            ...(detail.email ? [{ label: "Email", value: detail.email }] : []),
            ...(detail.phone ? [{ label: "Phone", value: detail.phone }] : []),
            ...(detail.gstin ? [{ label: "GSTIN", value: detail.gstin }] : []),
            ...(detail.billingAddress ? [{ label: "Address", value: detail.billingAddress }] : []),
            ...(detail.lastPaymentAt ? [{ label: "Last payment", value: detail.lastPaymentAt.toISOString().slice(0, 10) }] : []),
          ];
          return {
            text: `${detail.name} — ${INR(detail.outstandingInr)} outstanding across ${detail.invoiceCount} invoice${detail.invoiceCount === 1 ? "" : "s"}.`,
            blocks: [
              { kind: "client-detail", name: detail.name, fields },
              { kind: "links", items: [{ label: "Open client", href: `/clients/${detail.id}` }, { label: "New invoice", href: "/invoices/new" }] },
            ],
          };
        }
      }
      return {
        text: `Found ${matches.length} clients matching "${q}".`,
        blocks: [
          {
            kind: "clients",
            title: "Matching clients",
            rows: matches.map((m) => ({ id: m.id, name: m.company ?? m.name, href: `/clients/${m.id}` })),
          },
        ],
      };
    }

    case "reminders_who": {
      const open = await getOpenInvoices(orgId, now);
      const followUp = open.filter((i) => i.daysToDue <= 3).sort((a, b) => a.daysToDue - b.daysToDue);
      const sent = await getReminderSentSet(orgId, followUp.map((i) => i.id));
      return {
        text: followUp.length ? `${followUp.length} invoice${followUp.length === 1 ? "" : "s"} need a follow-up (overdue or due soon).` : "Nothing needs a follow-up right now.",
        blocks: followUp.length
          ? [{ kind: "invoices", title: "Follow up with", rows: followUp.map((i) => toInvoiceRow(i, now, sent)) }]
          : [],
        suggestions: followUp.length ? ["Send reminders"] : DEFAULT_SUGGESTIONS,
      };
    }

    case "send_reminders": {
      const open = await getOpenInvoices(orgId, now);
      const candidates = open.filter((i) => i.daysToDue <= 3);
      if (candidates.length === 0) {
        return { text: "No invoices are overdue or due within 3 days — no reminders to send.", blocks: [] };
      }
      return {
        text: `Ready to send payment reminders for ${candidates.length} invoice${candidates.length === 1 ? "" : "s"}.`,
        blocks: [
          {
            kind: "confirm",
            title: "Send payment reminders",
            lines: [
              { label: "Invoices", value: `${candidates.length}` },
              { label: "Overdue", value: `${candidates.filter((i) => i.daysToDue < 0).length}` },
              { label: "Due soon", value: `${candidates.filter((i) => i.daysToDue >= 0).length}` },
            ],
            note: "Emails go to clients with an email on file. Reminders are de-duplicated per day.",
            action: { type: "send_reminders" },
            confirmLabel: "Send reminders",
          },
        ],
      };
    }

    case "create_client":
      return startCreateClient(ctx, args.clientName, now);

    case "create_invoice":
      return startCreateInvoice(ctx, args.clientName, now);

    case "create_quote":
      return {
        text: "Let's create a quotation. I'll open the builder with everything ready.",
        blocks: [{ kind: "links", title: "New quotation", items: [{ label: "Open quotation builder", href: "/quotations/new" }] }],
        suggestions: ["Quotation stats", "Conversion rate"],
      };

    case "mark_paid": {
      const numQ = (args.invoiceNumber || "").trim();
      const open = await getOpenInvoices(orgId, now);
      const match = numQ ? open.find((i) => i.number.toLowerCase().includes(numQ.toLowerCase())) : undefined;
      if (!match) {
        return {
          text: numQ ? `I couldn't find an open invoice matching "${numQ}".` : "Which invoice should I mark paid? Tell me the invoice number.",
          blocks: open.length ? [{ kind: "invoices", title: "Open invoices", rows: open.slice(0, 6).map((i) => toInvoiceRow(i, now)) }] : [],
        };
      }
      return {
        text: `Mark ${match.number} (${match.clientName}) as paid?`,
        blocks: [
          {
            kind: "confirm",
            title: `Mark ${match.number} paid`,
            lines: [
              { label: "Client", value: match.clientName },
              { label: "Outstanding", value: formatMoney(match.outstanding, match.currency) },
            ],
            note: "Records a payment for the full outstanding balance.",
            action: { type: "mark_paid", invoiceId: match.id, number: match.number, amountLabel: formatMoney(match.outstanding, match.currency) },
            confirmLabel: "Mark paid",
          },
        ],
      };
    }

    case "insights":
      return buildInsights(ctx, now);

    case "help":
      return {
        text: "I'm your AI finance manager. Ask me about invoices, payments, clients and cash flow — or create invoices and clients by chatting. Try a chip below or type a slash command.",
        blocks: [
          {
            kind: "links",
            title: "Slash commands",
            items: [
              { label: "/pending", href: "#/pending" },
              { label: "/overdue", href: "#/overdue" },
              { label: "/revenue", href: "#/revenue" },
              { label: "/cashflow", href: "#/cashflow" },
              { label: "/report", href: "#/report" },
            ],
          },
        ],
        suggestions: DEFAULT_SUGGESTIONS,
      };

    case "unknown":
    default: {
      // Try a freeform AI answer with a light data context; else a helpful fallback.
      if (aiAvailable()) {
        const counts = await getInvoiceStatusCounts(orgId);
        const open = await getOpenInvoices(orgId, now);
        const outstanding = open.reduce((s, i) => s + i.outstandingInr, 0);
        const summary = `Org: ${ctx.orgName}. Open invoices: ${open.length}. Outstanding: ${INR(outstanding)}. Overdue: ${open.filter((i) => i.daysToDue < 0).length}. Invoice statuses: ${JSON.stringify(counts)}.`;
        const ans = await aiAnswer(message, summary);
        if (ans) return { text: ans, blocks: [], suggestions: DEFAULT_SUGGESTIONS };
      }
      return {
        text: "I'm not sure how to answer that yet. Try asking about overdue invoices, pending payments, revenue, or a client — or type /help.",
        blocks: [],
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }
  }
}

// ── Flows (multi-turn) ────────────────────────────────────────────────────────
async function continueFlow(ctx: AssistantCtx, flow: Flow, message: string, now: Date): Promise<AssistantTurn | null> {
  if (!flow) return null;

  if (flow.type === "create_client") {
    return buildClientConfirm(message);
  }

  if (flow.type === "create_invoice") {
    if (flow.step === "client") {
      return resolveInvoiceClient(ctx, message, now);
    }
    if (flow.step === "items") {
      return buildInvoiceConfirm(ctx, flow.data, message, now);
    }
  }
  return null;
}

async function startCreateClient(ctx: AssistantCtx, clientName: string | undefined, _now: Date): Promise<AssistantTurn> {
  if (clientName && clientName.length >= 2) return buildClientConfirm(clientName);
  return {
    text: "Sure — let's add a client. What's their name? You can also paste email, phone and GSTIN on the same line.",
    blocks: [],
    flow: { type: "create_client", step: "details", data: {} },
  };
}

function buildClientConfirm(text: string): AssistantTurn {
  // Parse name / email / phone / gstin / company from free text.
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  const phone = text.match(/(?<!\d)(?:\+?\d[\d\s-]{7,}\d)/)?.[0]?.trim();
  const gstin = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]\b/i)?.[0]?.toUpperCase();
  // name = first comma/segment minus the structured bits
  let name = text.split(/[,\n]/)[0].trim();
  if (email) name = name.replace(email, "").trim();
  if (phone) name = name.replace(phone, "").trim();
  name = name.replace(/[-–:]+\s*$/, "").trim();
  if (!name || name.length < 2) {
    return {
      text: "I need at least a name to create the client. What should I call them?",
      blocks: [],
      flow: { type: "create_client", step: "details", data: {} },
    };
  }
  const lines = [{ label: "Name", value: name }];
  if (email) lines.push({ label: "Email", value: email });
  if (phone) lines.push({ label: "Phone", value: phone });
  if (gstin) lines.push({ label: "GSTIN", value: gstin });
  return {
    text: `Create a client named ${name}?`,
    blocks: [
      {
        kind: "confirm",
        title: "Create client",
        lines,
        note: "You can add address & billing details later on the client page.",
        action: { type: "create_client", data: { name, email, phone, gstin, country: "IN" } },
        confirmLabel: "Create client",
      },
    ],
    flow: null,
  };
}

async function startCreateInvoice(ctx: AssistantCtx, clientName: string | undefined, now: Date): Promise<AssistantTurn> {
  if (clientName && clientName.length >= 2) {
    const resolved = await resolveInvoiceClient(ctx, clientName, now);
    return resolved;
  }
  return {
    text: "Let's create an invoice. Which client is it for?",
    blocks: [],
    flow: { type: "create_invoice", step: "client", data: {} },
  };
}

async function resolveInvoiceClient(ctx: AssistantCtx, query: string, now: Date): Promise<AssistantTurn> {
  const matches = await findClients(ctx.orgId, query, 6);
  if (matches.length === 0) {
    return {
      text: `I couldn't find a client matching "${query}". Add them first, then create the invoice.`,
      blocks: [{ kind: "links", items: [{ label: `Add "${query}" as a client`, href: "/clients/new" }] }],
      flow: { type: "create_invoice", step: "client", data: {} },
    };
  }
  if (matches.length > 1) {
    return {
      text: `I found a few clients matching "${query}". Which one? Reply with the exact name.`,
      blocks: [{ kind: "clients", title: "Matching clients", rows: matches.map((m) => ({ id: m.id, name: m.company ?? m.name, href: `/clients/${m.id}` })) }],
      flow: { type: "create_invoice", step: "client", data: {} },
    };
  }
  const c = matches[0];
  return {
    text: `Great — invoice for ${c.company ?? c.name}. What would you like to bill? List items like:\n• Video Production, 1, ₹25,000\n• Reels x5, ₹4,000`,
    blocks: [],
    flow: { type: "create_invoice", step: "items", data: { clientId: c.id, clientName: c.company ?? c.name, currency: c.defaultCurrency } },
  };
}

async function buildInvoiceConfirm(
  ctx: AssistantCtx,
  data: { clientId?: string; clientName?: string; currency?: string },
  message: string,
  now: Date
): Promise<AssistantTurn> {
  if (!data.clientId) return startCreateInvoice(ctx, undefined, now);

  let items = aiAvailable() ? await aiExtractItems(message) : [];
  if (items.length === 0) items = parseItemsFallback(message);
  items = items.filter((i) => i.name && i.name.length >= 1).slice(0, 12);

  if (items.length === 0) {
    return {
      text: "I couldn't read any line items. Try one item per line, e.g. `Video Production, 1, ₹25,000`.",
      blocks: [],
      flow: { type: "create_invoice", step: "items", data },
    };
  }

  // Resolve supply type from the client for an accurate GST preview.
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, orgId: ctx.orgId },
    select: { country: true, stateCode: true },
  });
  const supplyType: SupplyType = client ? resolveSupplyType({ country: client.country, stateCode: client.stateCode }) : "INTRA_STATE";
  const currency = data.currency ?? "INR";
  const totals = computeInvoiceTotals(
    supplyType,
    items.map((i) => ({ qty: i.qty, rate: i.rate, taxRate: i.taxRate ?? 18 })),
    { type: "PERCENT", value: 0 }
  );

  const lines = [
    ...items.map((i) => ({ label: `${i.name} ${i.qty > 1 ? `× ${i.qty}` : ""}`.trim(), value: formatMoney(i.qty * i.rate, currency) })),
    { label: "Subtotal", value: formatMoney(totals.subtotal, currency) },
    { label: `GST (${supplyType === "INTRA_STATE" ? "CGST+SGST" : supplyType === "INTER_STATE" || supplyType === "EXPORT_WITH_TAX" ? "IGST" : "0% export"})`, value: formatMoney(totals.totalTax, currency) },
    { label: "Total", value: formatMoney(totals.total, currency) },
  ];

  return {
    text: `Here's the invoice for ${data.clientName} — ${formatMoney(totals.total, currency)} total. Create it as a draft?`,
    blocks: [
      {
        kind: "confirm",
        title: `Invoice for ${data.clientName}`,
        lines,
        note: "Creates a DRAFT you can review, edit and send. Due in 15 days.",
        action: {
          type: "create_invoice",
          data: {
            clientId: data.clientId,
            clientName: data.clientName ?? "client",
            currency,
            supplyType,
            dueInDays: 15,
            items: items.map((i) => ({ name: i.name, qty: i.qty, rate: i.rate, taxRate: i.taxRate ?? 18 })),
          },
        },
        confirmLabel: "Create draft invoice",
      },
    ],
    flow: null,
  };
}

// ── Proactive insights (opening screen / dashboard) ───────────────────────────
export async function buildInsights(ctx: AssistantCtx, now: Date): Promise<AssistantTurn> {
  const [open, reportInvoices] = await Promise.all([getOpenInvoices(ctx.orgId, now), getReportInvoices(ctx.orgId)]);
  const overdue = open.filter((i) => i.daysToDue < 0);
  const dueTomorrow = open.filter((i) => i.daysToDue === 1);
  const outstanding = open.reduce((s, i) => s + i.outstandingInr, 0);
  const { thisMonth, lastMonth } = await getMonthlyCollected(ctx.orgId, now);
  const delta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  const insights: string[] = [];
  if (overdue.length) insights.push(`⚠️ ${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} (${INR(overdue.reduce((s, i) => s + i.outstandingInr, 0))}).`);
  if (outstanding > 0) insights.push(`💰 ${INR(outstanding)} pending collection.`);
  if (dueTomorrow.length) insights.push(`📅 ${dueTomorrow.length} invoice${dueTomorrow.length === 1 ? "" : "s"} due tomorrow.`);
  if (delta !== null) insights.push(`📈 Revenue ${delta >= 0 ? "up" : "down"} ${Math.abs(delta).toFixed(0)}% this month.`);
  const worst = overdue.sort((a, b) => a.daysToDue - b.daysToDue)[0];
  if (worst) insights.push(`🔔 ${worst.clientName} hasn't paid ${worst.number} — ${dueLabel(worst.dueDate, now)}.`);

  const text = insights.length
    ? `Hi! Here's your finance snapshot:\n${insights.map((i) => `• ${i}`).join("\n")}`
    : `Hi! I'm your AI finance manager. Everything looks clean — no overdue invoices. Ask me anything about your invoices, clients or cash flow.`;

  return {
    text,
    blocks: [],
    suggestions: overdue.length
      ? ["Show overdue invoices", "Send reminders", "Who owes the most?", "This month's revenue"]
      : DEFAULT_SUGGESTIONS,
  };
}
