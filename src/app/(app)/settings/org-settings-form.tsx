"use client";

import { useState } from "react";
import { fieldClasses, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateOrgProfile, type OrgProfileInput } from "@/actions/org";

export function OrgSettingsForm({ canEdit, initial }: { canEdit: boolean; initial: OrgProfileInput }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    try {
      await updateOrgProfile({
        name: get("name"),
        legalName: get("legalName"),
        gstin: get("gstin"),
        stateCode: get("stateCode"),
        address: get("address"),
        email: get("email"),
        phone: get("phone"),
        bankName: get("bankName"),
        bankAccount: get("bankAccount"),
        ifsc: get("ifsc"),
        lutNumber: get("lutNumber"),
        invoicePrefix: get("invoicePrefix"),
        quotePrefix: get("quotePrefix"),
      });
      setMsg("Saved.");
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const F = ({ name, label, ph }: { name: keyof OrgProfileInput; label: string; ph?: string }) => (
    <div>
      <Label>{label}</Label>
      <input
        name={name}
        defaultValue={initial[name] ?? ""}
        placeholder={ph}
        disabled={!canEdit}
        className={fieldClasses("w-full disabled:opacity-60")}
      />
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <F name="name" label="Workspace name" />
      <F name="legalName" label="Legal name" />
      <div className="grid grid-cols-2 gap-3">
        <F name="gstin" label="GSTIN" ph="22AAAAA0000A1Z5" />
        <F name="stateCode" label="State code" ph="32" />
      </div>
      <div>
        <Label>Address</Label>
        <textarea name="address" defaultValue={initial.address ?? ""} disabled={!canEdit} rows={2} className={fieldClasses("w-full disabled:opacity-60")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <F name="email" label="Email" />
        <F name="phone" label="Phone" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <F name="bankName" label="Bank name" />
        <F name="bankAccount" label="Account no." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <F name="ifsc" label="IFSC" />
        <F name="lutNumber" label="LUT number" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <F name="invoicePrefix" label="Invoice prefix" ph="INV" />
        <F name="quotePrefix" label="Quote prefix" ph="QT" />
      </div>
      {msg && <p className="text-[12.5px] text-[var(--text-mid)]">{msg}</p>}
      {canEdit ? (
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
      ) : (
        <p className="text-[12px] text-[var(--text-dim)]">Only owners and admins can edit the profile.</p>
      )}
    </form>
  );
}
