"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoice, updateInvoice } from "@/actions/invoices";
import { computeInvoiceTotals, resolveSupplyType, type SupplyType } from "@/lib/tax";
import { CURRENCIES } from "@/lib/money";
import { fieldClasses, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LineItemsEditor, emptyLine, type Line, type CatalogOpt } from "@/components/line-items-editor";
import { TotalsPanel } from "@/components/totals-panel";

type ClientOpt = { id: string; label: string; country: string; stateCode: string | null; currency: string };
type BankOpt = {
  id: string;
  label: string;
  bankName: string;
  accountNumber: string;
  ifsc: string | null;
  upi: string | null;
  isDefault: boolean;
};

export type InvoiceFormInitial = {
  clientId: string;
  bankAccountId?: string | null;
  currency: string;
  issueDate: string;
  dueDate: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  supplyType?: SupplyType | "";
  notes: string;
  terms: string;
  items: Line[];
};

const SUPPLY_LABELS: Record<SupplyType, string> = {
  INTRA_STATE: "Kerala (CGST + SGST)",
  INTER_STATE: "Other state (IGST)",
  EXPORT_LUT: "Export under LUT (0%)",
  EXPORT_WITH_TAX: "Export with tax (IGST)",
};

export function InvoiceForm({
  clients,
  catalog,
  bankAccounts = [],
  mode = "create",
  invoiceId,
  initial,
}: {
  clients: ClientOpt[];
  catalog: CatalogOpt[];
  bankAccounts?: BankOpt[];
  mode?: "create" | "edit";
  invoiceId?: string;
  initial?: InvoiceFormInitial;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultBank = bankAccounts.find((b) => b.isDefault) ?? bankAccounts[0];
  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? "");
  const [bankAccountId, setBankAccountId] = useState(initial?.bankAccountId ?? defaultBank?.id ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? clients[0]?.currency ?? "INR");
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? today);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? today);
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
      bankAccountId: bankAccountId || undefined,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      currency,
      supplyType: overrideSupply || undefined,
      discountType,
      discountValue,
      notes,
      items: items.filter((i) => i.name),
    };
    try {
      if (mode === "edit" && invoiceId) {
        await updateInvoice(invoiceId, payload);
        router.push(`/invoices/${invoiceId}`);
      } else {
        await createInvoice(payload);
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
            <Label>Due date</Label>
            <input type="date" className={fieldClasses("w-full")} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Bank account (shown on invoice)</Label>
            <a
              href="/banking/bank-accounts"
              target="_blank"
              className="text-[11.5px] font-semibold text-[var(--accent)] hover:underline"
            >
              Manage accounts →
            </a>
          </div>

          {bankAccounts.length === 0 ? (
            <div className="flex items-center justify-between rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--card-inset)] px-4 py-3 text-[12.5px] text-[var(--text-dim)]">
              <span>No bank accounts added yet.</span>
              <a
                href="/banking/bank-accounts"
                target="_blank"
                className="font-semibold text-[var(--accent)] hover:underline"
              >
                + Add one
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {bankAccounts.map((b) => {
                const selected = bankAccountId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBankAccountId(b.id)}
                    className={
                      "w-full rounded-[10px] border px-4 py-3 text-left transition-colors " +
                      (selected
                        ? "border-[var(--accent)] bg-[rgba(246,217,78,.07)]"
                        : "border-[var(--border)] bg-[var(--card-inset)] hover:border-[var(--border-2)] hover:bg-[var(--raised)]")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={
                            "text-[13px] font-semibold " +
                            (selected ? "text-[var(--accent)]" : "text-[var(--text)]")
                          }>
                            {b.label}
                          </span>
                          {b.isDefault && (
                            <span className="rounded-[5px] bg-[var(--divider)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-dim)]">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[11.5px] text-[var(--text-dim)]">
                          {b.bankName} · A/C {b.accountNumber}
                          {b.ifsc ? ` · ${b.ifsc}` : ""}
                          {b.upi ? ` · UPI ${b.upi}` : ""}
                        </div>
                      </div>
                      <span className={
                        "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors " +
                        (selected
                          ? "border-[var(--accent)] bg-[var(--accent)]"
                          : "border-[var(--border-2)]")
                      } />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
          {busy ? "Saving…" : mode === "edit" ? "Update invoice" : "Save invoice"}
        </Button>
      </Card>
    </div>
  );
}
