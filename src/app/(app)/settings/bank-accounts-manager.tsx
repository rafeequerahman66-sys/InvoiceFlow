"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldClasses, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  setDefaultBankAccount,
} from "@/actions/bank";

export type BankAccountRow = {
  id: string;
  label: string;
  bankName: string;
  accountName: string | null;
  accountNumber: string;
  ifsc: string | null;
  swift: string | null;
  upi: string | null;
  branch: string | null;
  isDefault: boolean;
};

const EMPTY = {
  label: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  ifsc: "",
  swift: "",
  upi: "",
  branch: "",
  isDefault: false,
};

export function BankAccountsManager({
  canManage,
  accounts,
}: {
  canManage: boolean;
  accounts: BankAccountRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function startCreate() {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
    setMsg("");
  }

  function startEdit(a: BankAccountRow) {
    setForm({
      label: a.label,
      bankName: a.bankName,
      accountName: a.accountName ?? "",
      accountNumber: a.accountNumber,
      ifsc: a.ifsc ?? "",
      swift: a.swift ?? "",
      upi: a.upi ?? "",
      branch: a.branch ?? "",
      isDefault: a.isDefault,
    });
    setEditingId(a.id);
    setShowForm(true);
    setMsg("");
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (editingId) await updateBankAccount(editingId, form);
      else await createBankAccount(form);
      setShowForm(false);
      setForm(EMPTY);
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this bank account? (Kept on past invoices.)")) return;
    setBusy(true);
    try {
      await deleteBankAccount(id);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    setBusy(true);
    try {
      await setDefaultBankAccount(id);
      router.refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === "isDefault" ? e.target.checked : e.target.value }));

  return (
    <div className="space-y-3">
      {accounts.length === 0 && !showForm && (
        <p className="text-[12.5px] text-[var(--text-dim)]">
          No bank accounts yet. Add one to show payment details on invoices.
        </p>
      )}

      <ul className="divide-y divide-[var(--row-divider)]">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 text-[13px]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-[var(--text)]">{a.label}</span>
                {a.isDefault && <Badge tone="green">Default</Badge>}
              </div>
              <div className="truncate text-[12px] text-[var(--text-dim)]">
                {a.bankName} · A/C {a.accountNumber}
                {a.ifsc ? ` · ${a.ifsc}` : ""}
                {a.swift ? ` · SWIFT ${a.swift}` : ""}
                {a.upi ? ` · UPI ${a.upi}` : ""}
              </div>
            </div>
            {canManage && (
              <div className="flex shrink-0 items-center gap-2 text-[12px]">
                {!a.isDefault && (
                  <button onClick={() => makeDefault(a.id)} disabled={busy} className="text-[var(--accent)] hover:underline">
                    Set default
                  </button>
                )}
                <button onClick={() => startEdit(a)} disabled={busy} className="text-[var(--text-mid)] hover:underline">
                  Edit
                </button>
                <button onClick={() => remove(a.id)} disabled={busy} className="text-[var(--negative)] hover:underline">
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {canManage && !showForm && (
        <Button type="button" size="sm" onClick={startCreate}>
          + Add bank account
        </Button>
      )}

      {canManage && showForm && (
        <form onSubmit={save} className="space-y-3 border-t border-[var(--divider)] pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Label *</Label>
              <input required value={form.label} onChange={set("label")} placeholder="HDFC Current" className={fieldClasses("w-full")} />
            </div>
            <div>
              <Label>Bank name *</Label>
              <input required value={form.bankName} onChange={set("bankName")} placeholder="HDFC Bank" className={fieldClasses("w-full")} />
            </div>
            <div>
              <Label>Account holder</Label>
              <input value={form.accountName} onChange={set("accountName")} placeholder="Crew Catalyst Innovations Pvt Ltd" className={fieldClasses("w-full")} />
            </div>
            <div>
              <Label>Account number *</Label>
              <input required value={form.accountNumber} onChange={set("accountNumber")} placeholder="50100XXXXXXXX" className={fieldClasses("w-full")} />
            </div>
            <div>
              <Label>IFSC</Label>
              <input value={form.ifsc} onChange={set("ifsc")} placeholder="HDFC0000123" className={fieldClasses("w-full")} />
            </div>
            <div>
              <Label>SWIFT (intl)</Label>
              <input value={form.swift} onChange={set("swift")} placeholder="HDFCINBB" className={fieldClasses("w-full")} />
            </div>
            <div>
              <Label>UPI</Label>
              <input value={form.upi} onChange={set("upi")} placeholder="name@okhdfc" className={fieldClasses("w-full")} />
            </div>
            <div>
              <Label>Branch</Label>
              <input value={form.branch} onChange={set("branch")} placeholder="MG Road, Kochi" className={fieldClasses("w-full")} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-mid)]">
            <input type="checkbox" checked={form.isDefault} onChange={set("isDefault")} />
            Use as default on new invoices
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Update account" : "Save account"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="text-[12.5px] font-semibold text-[var(--text-mid)] hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!canManage && <p className="text-[12px] text-[var(--text-dim)]">Only owners and admins can manage bank accounts.</p>}
      {msg && <p className="text-[12.5px] text-[var(--negative)]">{msg}</p>}
    </div>
  );
}
