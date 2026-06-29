"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { BlockView } from "./assistant-blocks";
import { executeAssistantAction } from "@/actions/assistant";
import type { AssistantBlock, AssistantEvent, Flow, PendingAction } from "@/lib/assistant/types";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  blocks?: AssistantBlock[];
  suggestions?: string[];
  streaming?: boolean;
};

const SLASH_COMMANDS = [
  { cmd: "/pending", desc: "Pending collections" },
  { cmd: "/overdue", desc: "Overdue invoices" },
  { cmd: "/due", desc: "Invoices due this week" },
  { cmd: "/revenue", desc: "Revenue this month" },
  { cmd: "/cashflow", desc: "Cash flow & receivables" },
  { cmd: "/report", desc: "Financial snapshot" },
  { cmd: "/reminders", desc: "Who to follow up" },
  { cmd: "/create invoice", desc: "Create an invoice" },
  { cmd: "/new client", desc: "Add a client" },
  { cmd: "/help", desc: "What I can do" },
];

const DEFAULT_CHIPS = ["Overdue invoices", "How much is pending?", "This month's revenue", "Who owes the most?"];

export function AssistantWidget({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [flow, setFlow] = useState<Flow>(null);
  const [busy, setBusy] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const greetedRef = useRef(false);
  const idRef = useRef(0);
  const storageKey = `if-assistant-${orgId}`;
  const newId = () => `m${++idRef.current}`;

  // Restore conversation for this org — validate shape, and seed idRef past the
  // restored ids so freshly generated ids never collide with them.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { messages?: unknown; flow?: unknown };
      const msgs = Array.isArray(parsed.messages)
        ? (parsed.messages as ChatMsg[]).filter(
            (m) => m && typeof m.id === "string" && (m.role === "user" || m.role === "assistant") && typeof m.text === "string"
          )
        : [];
      if (msgs.length) {
        setMessages(msgs.map((m) => ({ ...m, streaming: false })));
        setGreeted(true);
        greetedRef.current = true;
        const maxId = msgs.reduce((mx, m) => {
          const n = parseInt(m.id.replace(/^m/, ""), 10);
          return Number.isFinite(n) && n > mx ? n : mx;
        }, 0);
        idRef.current = maxId;
      }
      const f = parsed.flow as Flow;
      if (f && (f.type === "create_invoice" || f.type === "create_client")) setFlow(f);
    } catch {
      /* ignore corrupt storage */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist (cap to last 30 messages).
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ messages: messages.slice(-30), flow }));
    } catch {
      /* quota / private mode — non-fatal */
    }
  }, [messages, flow, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const stream = useCallback(
    async (text: string, opts?: { hiddenUser?: boolean }) => {
      if (busy) return;
      setBusy(true);
      const history = messages.slice(-12).map((m) => ({ role: m.role, content: m.text }));
      const assistantId = newId();
      setMessages((prev) => [
        ...prev,
        ...(opts?.hiddenUser ? [] : [{ id: newId(), role: "user" as const, text }]),
        { id: assistantId, role: "assistant" as const, text: "", streaming: true },
      ]);

      const patch = (fn: (m: ChatMsg) => ChatMsg) =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

      // Abort any prior in-flight stream and arm a fresh controller.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: text, history, flow }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("Assistant unavailable");

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n\n")) >= 0) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            let ev: AssistantEvent;
            try {
              ev = JSON.parse(dataLine.slice(6)) as AssistantEvent;
            } catch {
              continue;
            }
            if (ev.type === "token") patch((m) => ({ ...m, text: m.text + ev.value }));
            else if (ev.type === "block") patch((m) => ({ ...m, blocks: [...(m.blocks ?? []), ev.block] }));
            else if (ev.type === "suggestions") patch((m) => ({ ...m, suggestions: ev.values }));
            else if (ev.type === "flow") setFlow(ev.flow);
            else if (ev.type === "error") patch((m) => ({ ...m, text: m.text || `⚠️ ${ev.message}` }));
            else if (ev.type === "done") patch((m) => ({ ...m, streaming: false }));
          }
        }
        patch((m) => ({ ...m, streaming: false }));
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          patch((m) => ({ ...m, streaming: false }));
        } else {
          patch((m) => ({ ...m, streaming: false, text: m.text || "⚠️ I couldn't reach the assistant. Please try again." }));
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, messages, flow]
  );

  // Abort an in-flight stream when the panel closes or the component unmounts.
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Greet with live insights the first time the panel opens. Guarded by a ref
  // (not state) so React StrictMode's double-mount in dev can't fire it twice.
  useEffect(() => {
    if (open && !greetedRef.current && messages.length === 0) {
      greetedRef.current = true;
      setGreeted(true);
      void stream("__insights__", { hiddenUser: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape-to-close + focus management (mirrors the app's Dialog convention).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => taRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  // Restore focus to the launcher when the panel closes.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const onConfirm = useCallback(
    async (action: PendingAction) => {
      const res = await executeAssistantAction(action);
      if (res.ok) router.refresh();
      return res;
    },
    [router]
  );

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void stream(text);
  }

  function clearChat() {
    abortRef.current?.abort();
    setBusy(false);
    setMessages([]);
    setFlow(null);
    setGreeted(false);
    greetedRef.current = false;
    idRef.current = 0;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }

  const slashOpen = input.startsWith("/");
  const slashMatches = slashOpen
    ? SLASH_COMMANDS.filter((s) => s.cmd.startsWith(input.toLowerCase().split(" ")[0]))
    : [];
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.streaming);
  const chips = lastAssistant?.suggestions?.length ? lastAssistant.suggestions : DEFAULT_CHIPS;

  return (
    <>
      {/* Launcher */}
      <button
        ref={launcherRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open finance assistant"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[55] grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-lg shadow-black/30 transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)]/40 md:bottom-6 md:right-6"
      >
        <Icon name={open ? "close" : "sparkles"} size={24} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Finance Assistant"
          className="fixed inset-x-0 bottom-0 z-[60] flex h-[82vh] flex-col overflow-hidden rounded-t-[18px] border border-[var(--border)] bg-[var(--card)] shadow-2xl shadow-black/40 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[600px] sm:max-h-[calc(100vh-8rem)] sm:w-[400px] sm:rounded-[18px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--divider)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)]">
                <Icon name="sparkles" size={17} />
              </span>
              <div>
                <div className="text-[13.5px] font-bold leading-tight text-[var(--text)]">Finance Assistant</div>
                <div className="text-[11px] text-[var(--text-dim)]">{orgName}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={clearChat} className="rounded-[8px] px-2 py-1 text-[11px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40">
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--text-dim)] hover:bg-[var(--row-hover)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40">
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={busy}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--card-inset)] text-[var(--accent)]">
                  <Icon name="sparkles" size={24} />
                </span>
                <div className="text-[14px] font-bold text-[var(--text)]">Your AI finance manager</div>
                <p className="mt-1 max-w-[260px] text-[12px] text-[var(--text-dim)]">
                  Ask about invoices, payments, clients and cash flow — or create invoices by chatting.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex flex-col gap-2"}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-[14px] rounded-br-[4px] bg-[var(--accent)] px-3.5 py-2 text-[13px] font-medium text-[var(--accent-ink)]">
                    {m.text}
                  </div>
                ) : (
                  <>
                    {(m.text || m.streaming) && (
                      <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text)]">
                        {m.text}
                        {m.streaming && <span aria-hidden className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-[var(--accent)] align-middle" />}
                      </div>
                    )}
                    {m.blocks?.map((b, i) => (
                      <BlockView key={i} block={b} onConfirm={onConfirm} />
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Suggestion chips */}
          {!busy && (
            <div className="flex gap-2 overflow-x-auto border-t border-[var(--divider)] px-4 py-2.5">
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => void stream(c)}
                  className="shrink-0 rounded-full border border-[var(--border-2)] bg-[var(--card-inset)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Slash menu */}
          {slashOpen && slashMatches.length > 0 && (
            <div className="mx-4 mb-1 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card-inset)]">
              {slashMatches.map((s) => (
                <button
                  key={s.cmd}
                  onClick={() => {
                    setInput("");
                    void stream(s.cmd);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[var(--row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/40"
                >
                  <span className="font-mono text-[12px] font-semibold text-[var(--accent)]">{s.cmd}</span>
                  <span className="text-[11px] text-[var(--text-dim)]">{s.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="flex items-end gap-2 border-t border-[var(--divider)] p-3">
            <textarea
              ref={taRef}
              rows={1}
              aria-label="Message the finance assistant"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask anything, or type /"
              className="max-h-28 flex-1 resize-none rounded-[10px] border border-[var(--border)] bg-[var(--card-inset)] px-3 py-2 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
            />
            <button
              onClick={submit}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--accent)] text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-40"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
