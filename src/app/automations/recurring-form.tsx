"use client";

import { useMemo, useState } from "react";
import { createRecurring } from "@/actions/recurring";
import { computeInvoiceTotals, resolveSupplyType, type SupplyType } from "@/lib/tax";
import { CURRENCIES } from "@/lib/money";
import { fieldClasses, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LineItemsEditor, emptyLine, type Line, type CatalogOpt } from "@/components/line-items-editor";
import { TotalsPanel } from "@/components/totals-panel";

type ClientOpt = { id: string; label: string; country: string; stateCode: string | null; currency: string };
const CADENCES = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;

export function RecurringForm({ clients, catalog }: { clients: ClientOpt[]; catalog: CatalogOpt[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [currency, setCurrency] = useState(clients[0]?.currency ?? "INR");
  const [cadence, setCadence] = useState<(typeof CADENCES)[number]>("MONTHLY");
  const [nextRunDate, setNextRunDate] = useState(today);
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [discountValue, setDiscountValue] = useState(0);
  const [items, setItems] = useState<Line[]>([emptyLine()]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const client = clients.find((c) => c.id === clientId);
  const supplyType: SupplyType = client
    ? resolveSupplyType({ country: client.country, stateCode: client.stateCode })
    : "INTRA_STATE";
  const totals = useMemo(
    () => computeInvoiceTotals(supplyType, items, { type: discountType, value: discountValue }),
    [supplyType, items, discountType, discountValue]
  );

  async function submit() {
    setBusy(true);
    try {
      await createRecurring({
        title: title || undefined,
        clientId,
        cadence,
        nextRunDate: new Date(nextRunDate),
        currency,
        discountType,
        discountValue,
        notes,
        items: items.filter((i) => i.name),
      });
    } catch (e) {
      setBusy(false);
      alert((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>New recurring template</CardHeader>
      <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Title (optional)</Label>
              <input className={fieldClasses("w-full")} placeholder="Monthly retainer" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
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
              <Label>Cadence</Label>
              <select className={fieldClasses("w-full")} value={cadence} onChange={(e) => setCadence(e.target.value as typeof cadence)}>
                {CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>First run date</Label>
              <input type="date" className={fieldClasses("w-full")} value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} />
            </div>
          </div>

          <LineItemsEditor items={items} setItems={setItems} catalog={catalog} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Discount</Label>
              <input type="number" min={0} className={fieldClasses("w-full")} value={discountValue} onChange={(e) => setDiscountValue(+e.target.value)} />
            </div>
            <div>
              <Label>Discount type</Label>
              <select className={fieldClasses("w-full")} value={discountType} onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FLAT")}>
                <option value="PERCENT">%</option>
                <option value="FLAT">Flat</option>
              </select>
            </div>
          </div>

          <textarea className={fieldClasses("w-full")} rows={2} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="h-fit rounded-[12px] border border-[var(--border)] bg-[var(--card-inset)] p-4">
          <TotalsPanel totals={totals} supplyType={supplyType} currency={currency} />
          <Button onClick={submit} disabled={busy} className="mt-4 w-full py-2.5">
            {busy ? "Saving…" : "Create template"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
