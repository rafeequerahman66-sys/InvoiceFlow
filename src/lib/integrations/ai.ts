/**
 * AI helpers — stubbed behind an interface. The default impl is deterministic
 * (no network, no keys) so the UX is complete; swap in a real Claude-backed
 * provider later by implementing AIProvider and selecting it via AI_PROVIDER.
 */

export interface AIProvider {
  readonly name: string;
  generateItemDescription(itemName: string): Promise<string>;
  draftEmail(kind: "invoice" | "quote" | "reminder", context: Record<string, string>): Promise<string>;
  suggestQuoteItems(brief: string): Promise<Array<{ name: string; rate: number }>>;
}

class TemplateAI implements AIProvider {
  readonly name = "template-mock";

  async generateItemDescription(itemName: string): Promise<string> {
    return `Professional ${itemName.toLowerCase()} delivered to Rin Media's production standards, including planning, execution, and one round of revisions.`;
  }

  async draftEmail(
    kind: "invoice" | "quote" | "reminder",
    ctx: Record<string, string>
  ): Promise<string> {
    const who = ctx.clientName ?? "there";
    const doc = ctx.number ?? "";
    switch (kind) {
      case "invoice":
        return `Hi ${who},\n\nPlease find attached invoice ${doc}. Payment details are on the document. Let us know if you have any questions.\n\nThanks,\nRin Media`;
      case "quote":
        return `Hi ${who},\n\nThanks for the opportunity. Attached is quotation ${doc} for your review. It's valid until the date noted on the document.\n\nBest,\nRin Media`;
      case "reminder":
        return `Hi ${who},\n\nA gentle reminder that invoice ${doc} is awaiting payment. Please let us know if you need anything from our side.\n\nThanks,\nRin Media`;
    }
  }

  async suggestQuoteItems(brief: string): Promise<Array<{ name: string; rate: number }>> {
    // Deterministic stub: echoes the brief as one line item.
    return [{ name: brief.slice(0, 60) || "Creative service", rate: 0 }];
  }
}

// Future: class ClaudeAI implements AIProvider { ... } using the Anthropic SDK.
export function getAI(): AIProvider {
  switch (process.env.AI_PROVIDER) {
    // case "claude": return new ClaudeAI(process.env.ANTHROPIC_API_KEY!);
    default:
      return new TemplateAI();
  }
}
