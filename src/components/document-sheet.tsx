import { formatMoney, toNum } from "@/lib/money";
import type { DocItem } from "@/components/document-line-table";

export type SheetBusiness = {
  legalName: string;
  brandName: string;
  gstin: string;
  address: string;
  email: string;
  phone?: string | null;
  lutNumber?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  swift?: string | null;
  upi?: string | null;
  branch?: string | null;
  logoUrl?: string | null;
};

export type SheetData = {
  kind: "INVOICE" | "QUOTE";
  number: string;
  issueDate: string;
  secondaryDateLabel: string;
  secondaryDate: string;
  currency: string;
  supplyType: string;
  placeOfSupply?: string | null;
  items: DocItem[];
  subtotal: unknown;
  discountType?: string;
  discountValue?: unknown;
  cgst?: unknown;
  sgst?: unknown;
  igst?: unknown;
  totalTax?: unknown;
  total: unknown;
  notes?: string | null;
  terms?: string | null;
  lutDeclaration?: boolean;
  client: {
    name: string;
    company?: string | null;
    email?: string | null;
    billingAddress?: string | null;
    gstin?: string | null;
    country?: string;
  };
};

// Fixed light "paper" palette — a document is always dark-ink-on-white, theme-independent.
const INK = "#1A1D22";
const MUTED = "#6B707A";
const FAINT = "#9AA0A8";
const RULE = "#E5E7EB";
const ACCENT = "#F6D94E";
const ACCENT_INK = "#16140A";

export function DocumentSheet({
  data,
  business,
  watermark,
}: {
  data: SheetData;
  business: SheetBusiness | null;
  watermark?: string;
}) {
  const intra = data.supplyType === "INTRA_STATE";
  const title = data.kind === "INVOICE" ? "TAX INVOICE" : "QUOTATION";

  return (
    <div
      className="print-sheet relative mx-auto max-w-[720px] overflow-hidden rounded-[8px] bg-white p-[44px_48px] print:rounded-none print:p-0"
      style={{ color: INK, boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}
    >
      {watermark && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{
            transform: "rotate(-28deg)",
            fontSize: 130,
            fontWeight: 800,
            color: "rgba(116,217,160,.10)",
            letterSpacing: "0.1em",
          }}
        >
          {watermark}
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-start justify-between border-b pb-5" style={{ borderColor: RULE }}>
        <div className="flex items-start gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-[9px] text-[16px] font-extrabold"
            style={{ background: ACCENT, color: ACCENT_INK }}
          >
            {(business?.brandName ?? "R")[0]}
          </span>
          <div>
            <div className="text-[17px] font-extrabold">{business?.brandName ?? "Rin Media"}</div>
            <div className="text-[12px]" style={{ color: MUTED }}>
              {business?.legalName}
            </div>
            <div className="mt-1 max-w-[260px] whitespace-pre-wrap text-[11px]" style={{ color: MUTED }}>
              {business?.address}
            </div>
            {business?.gstin && <div className="mt-1 text-[11px] font-medium">GSTIN: {business.gstin}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[20px] font-extrabold tracking-tight">{title}</div>
          <div className="mt-1 font-mono text-[13px]">{data.number}</div>
          <div className="mt-2 text-[11px]" style={{ color: MUTED }}>
            <div>Issue: {data.issueDate}</div>
            <div>
              {data.secondaryDateLabel}: {data.secondaryDate}
            </div>
          </div>
        </div>
      </div>

      {/* Bill to */}
      <div className="relative grid grid-cols-2 gap-6 py-5">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.06em]" style={{ color: FAINT }}>
            Bill to
          </div>
          <div className="mt-1 text-[13px] font-bold">{data.client.company ?? data.client.name}</div>
          {data.client.company && (
            <div className="text-[12px]" style={{ color: MUTED }}>
              {data.client.name}
            </div>
          )}
          {data.client.billingAddress && (
            <div className="mt-1 whitespace-pre-wrap text-[11px]" style={{ color: MUTED }}>
              {data.client.billingAddress}
            </div>
          )}
          {data.client.gstin && <div className="mt-1 text-[11px]">GSTIN: {data.client.gstin}</div>}
        </div>
        <div className="text-right text-[11px]" style={{ color: MUTED }}>
          <div>Supply: {data.supplyType}</div>
          {data.placeOfSupply && <div>Place of supply: {data.placeOfSupply}</div>}
          <div>Currency: {data.currency}</div>
        </div>
      </div>

      {/* Items */}
      <table className="relative w-full text-[12px]">
        <thead>
          <tr style={{ background: ACCENT_INK, color: ACCENT }}>
            <th className="rounded-l-[6px] px-3 py-2 text-left font-bold">Item</th>
            <th className="px-3 py-2 text-left font-bold">SAC</th>
            <th className="px-3 py-2 text-right font-bold">Qty</th>
            <th className="px-3 py-2 text-right font-bold">Rate</th>
            <th className="px-3 py-2 text-right font-bold">Tax%</th>
            <th className="rounded-r-[6px] px-3 py-2 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${RULE}` }} className="align-top">
              <td className="px-3 py-2.5">
                <div className="font-semibold">{it.name}</div>
                {it.description && (
                  <div className="text-[11px]" style={{ color: MUTED }}>
                    {it.description}
                  </div>
                )}
              </td>
              <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>
                {it.sacCode ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-right tnum">{toNum(it.qty)}</td>
              <td className="px-3 py-2.5 text-right tnum">{formatMoney(toNum(it.rate), data.currency)}</td>
              <td className="px-3 py-2.5 text-right tnum">{toNum(it.taxRate)}%</td>
              <td className="px-3 py-2.5 text-right tnum font-semibold">{formatMoney(toNum(it.lineTotal), data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="relative mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-[12px]">
          <SheetRow k="Subtotal" v={formatMoney(toNum(data.subtotal), data.currency)} />
          {toNum(data.discountValue) > 0 && (
            <SheetRow k="Discount" v={data.discountType === "PERCENT" ? `${toNum(data.discountValue)}%` : "flat"} />
          )}
          {data.kind === "INVOICE" ? (
            intra ? (
              <>
                <SheetRow k="CGST" v={formatMoney(toNum(data.cgst), data.currency)} />
                <SheetRow k="SGST" v={formatMoney(toNum(data.sgst), data.currency)} />
              </>
            ) : (
              <SheetRow k="IGST" v={formatMoney(toNum(data.igst), data.currency)} />
            )
          ) : (
            <SheetRow k="Tax" v={formatMoney(toNum(data.totalTax), data.currency)} />
          )}
          <div
            className="flex justify-between pt-1.5 text-[16px] font-extrabold"
            style={{ borderTop: `1px solid #C9CCD2` }}
          >
            <span>Total</span>
            <span className="tnum">{formatMoney(toNum(data.total), data.currency)}</span>
          </div>
        </div>
      </div>

      {data.lutDeclaration && (
        <p className="relative mt-4 text-[11px] italic" style={{ color: MUTED }}>
          Supply meant for export of services under LUT without payment of IGST.
        </p>
      )}

      {/* Footer: bank + QR + signature */}
      <div className="relative mt-6 grid grid-cols-2 gap-6 border-t pt-5" style={{ borderColor: RULE }}>
        <div className="text-[11px]" style={{ color: MUTED }}>
          <div className="mb-1 font-bold" style={{ color: INK }}>
            Payment details
          </div>
          {business?.bankName && <div>Bank: {business.bankName}</div>}
          {business?.accountName && <div>Name: {business.accountName}</div>}
          {business?.bankAccount && <div>A/C: {business.bankAccount}</div>}
          {business?.ifsc && <div>IFSC: {business.ifsc}</div>}
          {business?.branch && <div>Branch: {business.branch}</div>}
          {business?.swift && <div>SWIFT: {business.swift}</div>}
          {business?.upi && <div>UPI: {business.upi}</div>}
          {data.notes && <div className="mt-2 whitespace-pre-wrap">{data.notes}</div>}
          {data.terms && <div className="mt-2 whitespace-pre-wrap">Terms: {data.terms}</div>}
        </div>
        <div className="flex items-start justify-end gap-4">
          <QrBlock />
          <div className="self-end text-right text-[11px]" style={{ color: MUTED }}>
            <div className="font-mono italic" style={{ color: INK }}>
              {(business?.brandName ?? "Rin Media").split(" ")[0]}
            </div>
            <div className="mt-1 border-t pt-1" style={{ borderColor: "#C9CCD2" }}>
              Authorised Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between" style={{ color: MUTED }}>
      <span>{k}</span>
      <span className="tnum" style={{ color: INK }}>
        {v}
      </span>
    </div>
  );
}

/** Simple decorative block-QR (placeholder; real generator in production). */
function QrBlock() {
  const cells = 7;
  const seed = [
    1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0,
    1, 0, 0, 1, 1, 0, 1, 0, 1, 1,
  ];
  return (
    <div className="grid h-20 w-20 shrink-0 grid-cols-7 gap-[2px] rounded-[6px] border p-1" style={{ borderColor: RULE }}>
      {Array.from({ length: cells * cells }).map((_, i) => (
        <span key={i} style={{ background: seed[i % seed.length] ? INK : "transparent" }} className="rounded-[1px]" />
      ))}
    </div>
  );
}
