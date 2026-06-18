import { formatMoney, toNum } from "@/lib/money";

export type DocItem = {
  name: string;
  description?: string | null;
  sacCode?: string | null;
  qty: unknown;
  rate: unknown;
  taxRate: unknown;
  lineTotal: unknown;
};

/** Read-only line-item table shared by invoice/quote detail and print views. */
export function DocumentLineTable({ items, currency }: { items: DocItem[]; currency: string }) {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-[var(--divider)] text-left text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text-faint)]">
          <th className="py-2 font-bold">Item</th>
          <th className="py-2 font-bold">SAC</th>
          <th className="py-2 text-right font-bold">Qty</th>
          <th className="py-2 text-right font-bold">Rate</th>
          <th className="py-2 text-right font-bold">Tax%</th>
          <th className="py-2 text-right font-bold">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i} className="border-b border-[var(--row-divider)] align-top">
            <td className="py-2.5">
              <div className="font-semibold text-[var(--text)]">{it.name}</div>
              {it.description && <div className="text-[12px] text-[var(--text-dim)]">{it.description}</div>}
            </td>
            <td className="py-2.5 font-mono text-[12px] text-[var(--text-dim)]">{it.sacCode ?? "—"}</td>
            <td className="py-2.5 text-right tnum text-[var(--text-mid)]">{toNum(it.qty)}</td>
            <td className="py-2.5 text-right tnum text-[var(--text-mid)]">{formatMoney(toNum(it.rate), currency)}</td>
            <td className="py-2.5 text-right tnum text-[var(--text-mid)]">{toNum(it.taxRate)}%</td>
            <td className="py-2.5 text-right tnum font-semibold text-[var(--text)]">{formatMoney(toNum(it.lineTotal), currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
