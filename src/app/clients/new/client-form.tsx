"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, updateClient } from "@/actions/clients";

export type ClientInitial = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  country: string;
  stateCode?: string;
  gstin?: string;
  defaultCurrency: string;
  notes?: string;
};

const INDIAN_STATES = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
];

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];

const inp =
  "w-full rounded-[10px] border border-[var(--border-2)] bg-[var(--card-inset)] px-3 py-2 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--accent)]";
const lbl = "mb-1.5 block text-[12px] font-medium text-[var(--text-soft)]";

export function ClientForm({
  mode = "create",
  clientId,
  initial,
}: {
  mode?: "create" | "edit";
  clientId?: string;
  initial?: ClientInitial;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState(initial?.country ?? "IN");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const payload = {
      name: get("name"),
      company: get("company") || undefined,
      email: get("email") || undefined,
      phone: get("phone") || undefined,
      billingAddress: get("billingAddress") || undefined,
      country: get("country") || "IN",
      stateCode: get("stateCode") || undefined,
      gstin: get("gstin") || undefined,
      defaultCurrency: get("defaultCurrency") || "INR",
      notes: get("notes") || undefined,
    };
    try {
      if (mode === "edit" && clientId) {
        await updateClient(clientId, payload);
        router.push(`/clients/${clientId}`);
      } else {
        await createClient(payload);
        router.push("/clients");
      }
    } catch (err) {
      alert((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Contact name *</label>
          <input name="name" required className={inp} placeholder="Jane Doe" defaultValue={initial?.name} />
        </div>
        <div>
          <label className={lbl}>Company</label>
          <input name="company" className={inp} placeholder="Acme Corp" defaultValue={initial?.company} />
        </div>
        <div>
          <label className={lbl}>Email</label>
          <input name="email" type="email" className={inp} placeholder="billing@example.com" defaultValue={initial?.email} />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input name="phone" className={inp} placeholder="+91 98765 43210" defaultValue={initial?.phone} />
        </div>
      </div>

      <div>
        <label className={lbl}>Billing address</label>
        <textarea name="billingAddress" className={inp} rows={3} placeholder="123 Main St, City, State 560001" defaultValue={initial?.billingAddress} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Country</label>
          <select
            name="country"
            className={inp}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="IN">India</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="DE">Germany</option>
            <option value="AE">UAE</option>
            <option value="SG">Singapore</option>
            <option value="AU">Australia</option>
            <option value="CA">Canada</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Default currency</label>
          <select name="defaultCurrency" className={inp} defaultValue={initial?.defaultCurrency}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {country === "IN" && (
          <>
            <div>
              <label className={lbl}>State</label>
              <select name="stateCode" className={inp} defaultValue={initial?.stateCode ?? ""}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>GSTIN (B2B clients)</label>
              <input
                name="gstin"
                className={inp}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                title="15-character GST Identification Number"
                defaultValue={initial?.gstin}
              />
            </div>
          </>
        )}
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea name="notes" className={inp} rows={2} placeholder="Internal notes" defaultValue={initial?.notes} />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-[10px] bg-[var(--accent)] px-5 py-2.5 text-[13px] font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {busy ? "Saving…" : mode === "edit" ? "Update client" : "Save client"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-[10px] border border-[var(--border-2)] px-5 py-2.5 text-[13px] font-semibold text-[var(--text-mid)] hover:bg-[var(--row-hover)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
