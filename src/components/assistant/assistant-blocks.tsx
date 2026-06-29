"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { Badge, statusTone } from "@/components/ui/badge";
import { Icon } from "@/components/icon";
import { BarChart } from "@/components/bar-chart";
import type { AssistantBlock, PendingAction } from "@/lib/assistant/types";
import type { AssistantActionResult } from "@/actions/assistant";

type ConfirmFn = (action: PendingAction) => Promise<AssistantActionResult>;

export function BlockView({ block, onConfirm }: { block: AssistantBlock; onConfirm: ConfirmFn }) {
  switch (block.kind) {
    case "stat":
      return <StatBlock block={block} />;
    case "invoices":
      return <InvoicesBlock block={block} />;
    case "clients":
      return <ClientsBlock block={block} />;
    case "quotes":
      return <QuotesBlock block={block} />;
    case "bars":
      return (
        <Shell title={block.title}>
          <BarChart data={block.points} />
        </Shell>
      );
    case "compare":
      return <CompareBlock block={block} />;
    case "client-detail":
      return <ClientDetailBlock block={block} />;
    case "links":
      return <LinksBlock block={block} />;
    case "confirm":
      return <ConfirmBlock block={block} onConfirm={onConfirm} />;
    default:
      return null;
  }
}

function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card-inset)] p-3">
      {title && <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-[var(--text-faint)]">{title}</div>}
      {children}
    </div>
  );
}

function StatBlock({ block }: { block: Extract<AssistantBlock, { kind: "stat" }> }) {
  const valueColor =
    block.tone === "positive" ? "text-[var(--positive)]" : block.tone === "negative" ? "text-[var(--negative)]" : "text-[var(--text)]";
  return (
    <Shell title={block.title}>
      <div className={`tnum text-[24px] font-extrabold leading-tight ${valueColor}`}>{block.value}</div>
      {block.caption && <div className="mt-0.5 text-[12px] text-[var(--text-dim)]">{block.caption}</div>}
      {block.items && block.items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {block.items.map((it, i) => (
            <div key={i} className="min-w-0">
              <div className="text-[11px] text-[var(--text-faint)]">{it.label}</div>
              <div className="truncate text-[12.5px] font-semibold text-[var(--text-mid)]">{it.value}</div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function InvoicesBlock({ block }: { block: Extract<AssistantBlock, { kind: "invoices" }> }) {
  if (block.rows.length === 0) return <Shell title={block.title}><Empty text={block.emptyText ?? "Nothing here."} /></Shell>;
  return (
    <Shell title={block.title}>
      <ul className="space-y-1.5">
        {block.rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/invoices/${r.id}`}
              className="flex items-center justify-between gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            >
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-semibold text-[var(--text)]">{r.client}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                  <span className="font-mono">{r.number}</span>
                  {r.dueLabel && <span>· {r.dueLabel}</span>}
                  {r.reminderSent !== undefined && (
                    <span className={r.reminderSent ? "text-[var(--positive)]" : "text-[var(--text-faint)]"}>
                      · {r.reminderSent ? "Reminded" : "No reminder"}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="tnum text-[12.5px] font-bold text-[var(--text)]">{formatMoney(r.amount, r.currency)}</div>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function ClientsBlock({ block }: { block: Extract<AssistantBlock, { kind: "clients" }> }) {
  if (block.rows.length === 0) return <Shell title={block.title}><Empty text={block.emptyText ?? "No clients."} /></Shell>;
  const max = Math.max(1, ...block.rows.map((r) => r.outstanding ?? r.billed ?? 0));
  return (
    <Shell title={block.title}>
      <ul className="space-y-2">
        {block.rows.map((r) => {
          const val = r.outstanding ?? r.billed ?? 0;
          const inner = (
            <>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[12.5px] font-semibold text-[var(--text)]">{r.name}</span>
                {(r.outstanding ?? r.billed) !== undefined && (
                  <span className="tnum shrink-0 text-[12.5px] font-bold text-[var(--text)]">{formatMoney(val, "INR")}</span>
                )}
              </div>
              {(r.outstanding ?? r.billed) !== undefined && (
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--divider)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(val / max) * 100}%` }} />
                </div>
              )}
            </>
          );
          return (
            <li key={r.id}>
              {r.href ? (
                <Link
                  href={r.href}
                  className="block rounded-[9px] px-1 py-0.5 hover:bg-[var(--row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                >
                  {inner}
                </Link>
              ) : (
                <div className="px-1">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

function QuotesBlock({ block }: { block: Extract<AssistantBlock, { kind: "quotes" }> }) {
  if (block.rows.length === 0) return <Shell title={block.title}><Empty text={block.emptyText ?? "No quotations."} /></Shell>;
  return (
    <Shell title={block.title}>
      <ul className="space-y-1.5">
        {block.rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/quotations/${r.id}`}
              className="flex items-center justify-between gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
            >
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-semibold text-[var(--text)]">{r.client}</div>
                <span className="font-mono text-[11px] text-[var(--text-dim)]">{r.number}</span>
              </div>
              <div className="shrink-0 text-right">
                <div className="tnum text-[12.5px] font-bold text-[var(--text)]">{formatMoney(r.amount, r.currency)}</div>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function CompareBlock({ block }: { block: Extract<AssistantBlock, { kind: "compare" }> }) {
  const cur = block.currency ?? "INR";
  const up = (block.deltaPct ?? 0) >= 0;
  return (
    <Shell title={block.title}>
      <div className="flex items-end gap-4">
        <div>
          <div className="text-[11px] text-[var(--text-faint)]">{block.a.label}</div>
          <div className="tnum text-[20px] font-extrabold text-[var(--text)]">{formatMoney(block.a.value, cur)}</div>
        </div>
        <div className="pb-1 text-[var(--text-faint)]">vs</div>
        <div>
          <div className="text-[11px] text-[var(--text-faint)]">{block.b.label}</div>
          <div className="tnum text-[20px] font-extrabold text-[var(--text-mid)]">{formatMoney(block.b.value, cur)}</div>
        </div>
        {block.deltaPct !== null && (
          <div className="ml-auto pb-1">
            <Badge tone={up ? "green" : "red"}>
              {up ? "▲" : "▼"} {Math.abs(block.deltaPct).toFixed(0)}%
            </Badge>
          </div>
        )}
      </div>
    </Shell>
  );
}

function ClientDetailBlock({ block }: { block: Extract<AssistantBlock, { kind: "client-detail" }> }) {
  return (
    <Shell title={block.name}>
      <div className="space-y-1.5">
        {block.fields.map((f, i) => (
          <div key={i} className="flex items-start justify-between gap-3 text-[12.5px]">
            <span className="shrink-0 text-[var(--text-faint)]">{f.label}</span>
            <span className="text-right font-medium text-[var(--text-mid)]">{f.value}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function LinksBlock({ block }: { block: Extract<AssistantBlock, { kind: "links" }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {block.items.map((it, i) =>
        it.href.startsWith("#") ? (
          <span key={i} className="rounded-[8px] border border-[var(--border)] bg-[var(--card-inset)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--text-mid)]">
            {it.label}
          </span>
        ) : (
          <Link
            key={i}
            href={it.href}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border-2)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
          >
            {it.label}
            <Icon name="send" size={12} />
          </Link>
        )
      )}
    </div>
  );
}

function ConfirmBlock({ block, onConfirm }: { block: Extract<AssistantBlock, { kind: "confirm" }>; onConfirm: ConfirmFn }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [result, setResult] = useState<AssistantActionResult | null>(null);

  async function go() {
    setState("busy");
    try {
      const res = await onConfirm(block.action);
      setResult(res);
      setState(res.ok ? "done" : "error");
    } catch (e) {
      setResult({ ok: false, message: (e as Error).message });
      setState("error");
    }
  }

  return (
    <div className="rounded-[12px] border border-[var(--accent)]/40 bg-[var(--card-inset)] p-3">
      <div className="mb-2 text-[12.5px] font-bold text-[var(--text)]">{block.title}</div>
      <div className="space-y-1">
        {block.lines.map((l, i) => (
          <div key={i} className="flex items-start justify-between gap-3 text-[12px]">
            <span className="shrink-0 text-[var(--text-faint)]">{l.label}</span>
            <span className="text-right font-medium text-[var(--text-mid)]">{l.value}</span>
          </div>
        ))}
      </div>
      {block.note && <div className="mt-2 text-[11px] text-[var(--text-dim)]">{block.note}</div>}

      {state === "done" && result?.ok ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-[9px] border border-[var(--positive)]/30 bg-[var(--card-inset)] px-3 py-2 text-[12px] font-semibold text-[var(--positive)]">
          <span>{result.message}</span>
          {result.href && (
            <Link href={result.href} className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40">
              Open →
            </Link>
          )}
        </div>
      ) : state === "error" ? (
        <div className="mt-3 space-y-2">
          <div className="text-[12px] font-medium text-[var(--negative)]">{result?.message ?? "Failed."}</div>
          <button onClick={go} className="text-[12px] font-semibold text-[var(--accent)] hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <button
          onClick={go}
          disabled={state === "busy"}
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-[9px] bg-[var(--accent)] px-3.5 py-2 text-[12.5px] font-bold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-60"
        >
          {state === "busy" ? "Working…" : block.confirmLabel}
        </button>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-2 text-[12px] text-[var(--text-dim)]">{text}</div>;
}
