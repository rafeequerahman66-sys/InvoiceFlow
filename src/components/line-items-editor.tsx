"use client";

import { fieldClasses } from "@/components/ui/input";
import { getAI } from "@/lib/integrations/ai";

export type Line = { name: string; description?: string; qty: number; rate: number; taxRate: number };
export type CatalogOpt = { id: string; name: string; rate: number; tax: number };

export function emptyLine(): Line {
  return { name: "", qty: 1, rate: 0, taxRate: 18 };
}

export function LineItemsEditor({
  items,
  setItems,
  catalog,
}: {
  items: Line[];
  setItems: (updater: (arr: Line[]) => Line[]) => void;
  catalog: CatalogOpt[];
}) {
  const setItem = (i: number, patch: Partial<Line>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  // Autofill rate/tax when a catalog item name is matched.
  const onName = (i: number, value: string) => {
    const match = catalog.find((c) => c.name === value);
    if (match) setItem(i, { name: value, rate: match.rate, taxRate: match.tax });
    else setItem(i, { name: value });
  };

  const aiDescribe = async (i: number) => {
    const name = items[i]?.name?.trim();
    if (!name) return;
    const text = await getAI().generateItemDescription(name);
    setItem(i, { description: text });
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-medium text-[var(--text-soft)]">Line items</span>
        <span className="text-[10px] text-[var(--text-dim)]">qty · rate · tax%</span>
      </div>

      {items.map((li, i) => (
        <div key={i} className="mb-2 rounded-[10px] border border-[var(--border)] p-2">
          <div className="flex gap-2">
            <input
              className={fieldClasses("flex-1")}
              placeholder="Description"
              value={li.name}
              onChange={(e) => onName(i, e.target.value)}
              list="catalog"
            />
            <input
              className={fieldClasses("w-14 text-center")}
              type="number"
              min={0}
              value={li.qty}
              onChange={(e) => setItem(i, { qty: +e.target.value })}
            />
            <input
              className={fieldClasses("w-28 text-right")}
              type="number"
              min={0}
              placeholder="Rate"
              value={li.rate}
              onChange={(e) => setItem(i, { rate: +e.target.value })}
            />
            <input
              className={fieldClasses("w-14 text-right")}
              type="number"
              min={0}
              max={28}
              value={li.taxRate}
              onChange={(e) => setItem(i, { taxRate: +e.target.value })}
              title="Tax %"
            />
            <button
              type="button"
              onClick={() => setItems((a) => (a.length > 1 ? a.filter((_, idx) => idx !== i) : a))}
              className="px-2 text-rose-500 hover:text-rose-600"
              title="Remove line"
            >
              ×
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              className={fieldClasses("flex-1 text-xs")}
              placeholder="Item notes (optional)"
              value={li.description ?? ""}
              onChange={(e) => setItem(i, { description: e.target.value })}
            />
            <button
              type="button"
              onClick={() => aiDescribe(i)}
              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--nav-hover)]"
              title="Generate description (AI stub)"
            >
              ✨ AI describe
            </button>
          </div>
        </div>
      ))}

      <datalist id="catalog">
        {catalog.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={() => setItems((a) => [...a, emptyLine()])}
        className="text-[12px] font-semibold text-[var(--accent)]"
      >
        + Add line
      </button>
    </div>
  );
}
