"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createQuote, updateQuote } from "@/actions/quotes";
import { computeInvoiceTotals, resolveSupplyType, type SupplyType } from "@/lib/tax";
import { CURRENCIES } from "@/lib/money";
import { fieldClasses, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LineItemsEditor, emptyLine, type Line, type CatalogOpt } from "@/components/line-items-editor";
import { TotalsPanel } from "@/components/totals-panel";

type ClientOpt = { id: string; label: string; country: string; stateCode: string | null; currency: string };

export type QuoteFormInitial = {
  clientId: string;
  currency: string;
  issueDate: string;
  validTill: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  supplyType?: SupplyType | "";
  notes: string;
  items: Line[];
};

const SUPPLY_LABELS: Record<SupplyType, string> = {
  INTRA_STATE: "Kerala (CGST + SGST)",
  INTER_STATE: "Other state (IGST)",
  EXPORT_LUT: "Export under LUT (0%)",
  EXPORT_WITH_TAX: "Export with tax (IGST)",
};

export function QuoteForm({
  clients,
  catalog,
  mode = "create",
  quoteId,
  initial,
}: {
  clients: ClientOpt[];
  catalog: CatalogOpt[];
  mode?: "create" | "edit";
  quoteId?: string;
  initial?: QuoteFormInitial;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const in15 = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? clients[0]?.currency ?? "INR");
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? today);
  const [validTill, setValidTill] = useState(initial?.validTill ?? in15);
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">(initial?.discountType ?? "PERCENT");
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? 0);
  const [overrideSupply, setOverrideSupply] = useState<SupplyType | "">(initial?.supplyType ?? "");
  const [items, setItems] = useState<Line[]>(initial?.items?.length ? initial.items : [emptyLine()]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const client = clients.find((c) => c.id === clientId);
  const supplyType: SupplyType =
    (overrideSupply ||
      (client ? resolveSupplyType({ country: client.country, stateCode: client.stateCode }) : "INTRA_STATE")) as SupplyType;

  const totals = useMemo(
    () => computeInvoiceTotals(supplyType, items, { type: discountType, value: discountValue }),
    [supplyType, items, discountType, discountValue]
  );

  async function submit() {
    setBusy(true);
    const payload = {
      clientId,
      issueDate: new Date(issueDate),
      validTill: new Date(validTill),
      currency,
      supplyType: overrideSupply || undefined,
      discountType,
      discountValue,
      notes,
      items: items.filter((i) => i.name),
    };
    try {
      if (mode === "edit" && quoteId) {
        await updateQuote(quoteId, payload);
        router.push(`/quotations/${quoteId}`);
      } else {
        await createQuote(payload);
      }
    } catch (e) {
      setBusy(false);
      alert((e as Error).message);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Client</Label>
            <select
              className={fieldClasses("w-full")}
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                const c = clients.find((x) => x.id === e.target.value);
                if (c) setCurrency(c.currency);
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Currency</Label>
            <select className={fieldClasses("w-full")} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Issue date</Label>
            <input type="date" className={fieldClasses("w-full")} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <Label>Valid till</Label>
            <input type="date" className={fieldClasses("w-full")} value={validTill} onChange={(e) => setValidTill(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Supply type (auto from client — override if needed)</Label>
          <select
            className={fieldClasses("w-full")}
            value={overrideSupply}
            onChange={(e) => setOverrideSupply(e.target.value as SupplyType | "")}
          >
            <option value="">Auto: {SUPPLY_LABELS[supplyType]}</option>
            {Object.entries(SUPPLY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <LineItemsEditor items={items} setItems={setItems} catalog={catalog} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Discount</Label>
            <input
              type="number"
              min={0}
              className={fieldClasses("w-full")}
              value={discountValue}
              onChange={(e) => setDiscountValue(+e.target.value)}
            />
          </div>
          <div>
            <Label>Discount type</Label>
            <select
              className={fieldClasses("w-full")}
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FLAT")}
            >
              <option value="PERCENT">%</option>
              <option value="FLAT">Flat</option>
            </select>
          </div>
        </div>

        <textarea
          className={fieldClasses("w-full")}
          rows={2}
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Card className="h-fit p-4">
        <TotalsPanel totals={totals} supplyType={supplyType} currency={currency} />
        <Button onClick={submit} disabled={busy} className="mt-4 w-full py-2.5">
          {busy ? "Saving…" : mode === "edit" ? "Update quotation" : "Save quotation"}
        </Button>
      </Card>
    </div>
  );
}
