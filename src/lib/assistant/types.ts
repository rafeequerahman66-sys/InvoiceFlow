/**
 * Shared types for the AI Finance Assistant. PURE — no server-only / Prisma /
 * React imports, so both the server engine and the client widget can import it.
 *
 * The assistant streams "blocks" (rich cards) + a natural-language "text" line.
 * Write operations never execute inline; they return a `confirm` block whose
 * `action` is re-validated + executed server-side only after the user clicks.
 */

export type StatItem = { label: string; value: string };

export type InvoiceRow = {
  id: string;
  number: string;
  client: string;
  amount: number; // in the invoice's own currency
  currency: string;
  status: string;
  dueLabel?: string; // "Due in 3 days" / "12 days overdue"
  reminderSent?: boolean;
};

export type ClientRow = {
  id: string;
  name: string;
  outstanding?: number; // INR
  billed?: number; // INR
  invoiceCount?: number;
  /** Set ONLY for rows backed by a real client record. Aggregated-by-name rows
   *  (e.g. "top outstanding") omit it so the UI doesn't link to a 404. */
  href?: string;
};

export type QuoteRow = {
  id: string;
  number: string;
  client: string;
  amount: number;
  currency: string;
  status: string;
};

/** A sensitive operation that requires explicit user confirmation before running. */
export type PendingAction =
  | {
      type: "create_client";
      data: {
        name: string;
        company?: string;
        email?: string;
        phone?: string;
        gstin?: string;
        country?: string;
        stateCode?: string;
      };
    }
  | {
      type: "create_invoice";
      data: {
        clientId: string;
        clientName: string;
        currency: string;
        supplyType?: "INTRA_STATE" | "INTER_STATE" | "EXPORT_LUT" | "EXPORT_WITH_TAX";
        dueInDays: number;
        items: { name: string; qty: number; rate: number; taxRate: number }[];
      };
    }
  | { type: "mark_paid"; invoiceId: string; number: string; amountLabel: string }
  | { type: "send_reminders" };

export type AssistantBlock =
  | {
      kind: "stat";
      title: string;
      value: string;
      caption?: string;
      items?: StatItem[];
      tone?: "default" | "positive" | "negative";
    }
  | { kind: "invoices"; title: string; rows: InvoiceRow[]; emptyText?: string }
  | { kind: "clients"; title: string; rows: ClientRow[]; emptyText?: string }
  | { kind: "quotes"; title: string; rows: QuoteRow[]; emptyText?: string }
  | { kind: "bars"; title: string; points: { label: string; value: number }[]; currency?: string }
  | {
      kind: "compare";
      title: string;
      a: { label: string; value: number };
      b: { label: string; value: number };
      deltaPct: number | null;
      currency?: string;
    }
  | { kind: "client-detail"; name: string; fields: StatItem[] }
  | { kind: "confirm"; title: string; lines: StatItem[]; note?: string; action: PendingAction; confirmLabel: string }
  | { kind: "links"; title?: string; items: { label: string; href: string }[] };

/** Multi-turn slot-filling state, carried by the client and echoed back each turn. */
export type Flow =
  | null
  | { type: "create_invoice"; step: "client" | "items"; data: { clientId?: string; clientName?: string; currency?: string } }
  | { type: "create_client"; step: "details"; data: Record<string, never> };

export type AssistantTurn = {
  text: string;
  blocks: AssistantBlock[];
  suggestions?: string[];
  flow?: Flow;
};

export type AssistantRequest = {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  flow?: Flow;
  context?: { page?: string };
};

/** SSE event envelope streamed from /api/assistant. */
export type AssistantEvent =
  | { type: "token"; value: string }
  | { type: "block"; block: AssistantBlock }
  | { type: "flow"; flow: Flow }
  | { type: "suggestions"; values: string[] }
  | { type: "done" }
  | { type: "error"; message: string };
