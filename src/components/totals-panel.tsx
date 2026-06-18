import { formatMoney } from "@/lib/money";
import type { InvoiceTotals, SupplyType } from "@/lib/tax";

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div
      className={
        strong
          ? "flex justify-between border-t border-[var(--divider)] pt-2 text-[15px] font-extrabold text-[var(--text)]"
          : "flex justify-between text-[var(--text-soft)]"
      }
    >
      <span>{k}</span>
      <span className="tnum">{v}</span>
    </div>
  );
}

export function TotalsPanel({
  totals,
  supplyType,
  currency,
}: {
  totals: InvoiceTotals;
  supplyType: SupplyType;
  currency: string;
}) {
  return (
    <div className="space-y-1.5 text-[13px]">
      <Row k="Subtotal" v={formatMoney(totals.subtotal, currency)} />
      {totals.discount > 0 && <Row k="Discount" v={"- " + formatMoney(totals.discount, currency)} />}
      {supplyType === "INTRA_STATE" ? (
        <>
          <Row k="CGST" v={formatMoney(totals.cgst, currency)} />
          <Row k="SGST" v={formatMoney(totals.sgst, currency)} />
        </>
      ) : totals.igst > 0 ? (
        <Row k="IGST" v={formatMoney(totals.igst, currency)} />
      ) : (
        <Row k="Tax" v={formatMoney(0, currency)} />
      )}
      <Row k="Total" v={formatMoney(totals.total, currency)} strong />
    </div>
  );
}
