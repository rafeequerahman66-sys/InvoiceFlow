import { NextRequest } from "next/server";
import { requireOrg } from "@/lib/tenant";
import { runAssistant } from "@/lib/assistant/engine";
import type { AssistantEvent, AssistantRequest } from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streaming finance-assistant endpoint (Server-Sent Events). Each line is
 * `data: <AssistantEvent JSON>`. The turn is computed server-side (org-scoped),
 * then the natural-language text is streamed word-by-word for a typing effect,
 * followed by rich blocks, flow state, and suggestion chips.
 */
export async function POST(req: NextRequest) {
  // Auth boundary — resolves the caller's org. Redirects if unauthenticated.
  const ctx = await requireOrg("VIEWER");

  let body: AssistantRequest;
  try {
    body = (await req.json()) as AssistantRequest;
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!body || typeof body.message !== "string") {
    return new Response("Bad request", { status: 400 });
  }

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, ev: AssistantEvent) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const turn = await runAssistant(
          { orgId: ctx.orgId, userId: ctx.userId, role: ctx.role, orgName: ctx.orgName },
          {
            message: body.message.slice(0, 2000),
            history: (body.history ?? []).slice(-12),
            flow: body.flow ?? null,
            context: body.context,
          }
        );

        // Stream the text word-by-word (typing animation). Budget ~900ms total.
        const tokens = turn.text.match(/\S+\s*/g) ?? [turn.text];
        const delay = Math.min(22, Math.floor(900 / Math.max(1, tokens.length)));
        for (const t of tokens) {
          send(controller, { type: "token", value: t });
          if (delay > 0) await sleep(delay);
        }

        for (const block of turn.blocks) send(controller, { type: "block", block });
        send(controller, { type: "flow", flow: turn.flow ?? null });
        if (turn.suggestions?.length) send(controller, { type: "suggestions", values: turn.suggestions });
        send(controller, { type: "done" });
      } catch (err) {
        send(controller, { type: "error", message: (err as Error).message || "Something went wrong." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
