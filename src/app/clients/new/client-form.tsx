"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, updateClient } from "@/actions/clients";
import { extractClientFields } from "@/actions/ai";

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

type Fields = {
  name: string;
  company: string;
  email: string;
  phone: string;
  billingAddress: string;
  country: string;
  stateCode: string;
  gstin: string;
  defaultCurrency: string;
  notes: string;
};

/** Small confidence pill shown next to AI-filled fields. */
function Conf({ score }: { score?: number }) {
  if (score == null || score <= 0) return null;
  const tone =
    score >= 85
      ? { bg: "rgba(116,217,160,.14)", fg: "var(--positive)" }
      : score >= 60
        ? { bg: "rgba(246,217,78,.16)", fg: "var(--accent)" }
        : { bg: "rgba(242,134,138,.14)", fg: "var(--negative)" };
  return (
    <span
      className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold align-middle"
      style={{ background: tone.bg, color: tone.fg }}
      title="AI confidence"
    >
      AI {score}%
    </span>
  );
}

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

  const [f, setF] = useState<Fields>({
    name: initial?.name ?? "",
    company: initial?.company ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    billingAddress: initial?.billingAddress ?? "",
    country: initial?.country ?? "IN",
    stateCode: initial?.stateCode ?? "",
    gstin: initial?.gstin ?? "",
    defaultCurrency: initial?.defaultCurrency ?? "INR",
    notes: initial?.notes ?? "",
  });
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((p) => ({ ...p, [k]: v }));

  // --- AI assistant state ---
  const [showAi, setShowAi] = useState(mode === "create");
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [conf, setConf] = useState<Record<string, number>>({});

  async function runExtract() {
    setAiBusy(true);
    setAiMsg("");
    try {
      const res = await extractClientFields(aiText);
      if (!res.ok) {
        setAiMsg(res.error);
        return;
      }
      setF((p) => ({
        // Only overwrite a field if the AI returned something for it.
        name: res.fields.name || p.name,
        company: res.fields.company || p.company,
        email: res.fields.email || p.email,
        phone: res.fields.phone || p.phone,
        billingAddress: res.fields.billingAddress || p.billingAddress,
        country: res.fields.country || p.country,
        stateCode: res.fields.stateCode || p.stateCode,
        gstin: res.fields.gstin || p.gstin,
        defaultCurrency: res.fields.defaultCurrency || p.defaultCurrency,
        notes: res.fields.notes || p.notes,
      }));
      setConf(res.confidence ?? {});
      setAiMsg("Filled below — review and edit before saving.");
    } catch (err) {
      setAiMsg((err as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: f.name.trim(),
      company: f.company.trim() || undefined,
      email: f.email.trim() || undefined,
      phone: f.phone.trim() || undefined,
      billingAddress: f.billingAddress.trim() || undefined,
      country: f.country || "IN",
      stateCode: f.stateCode || undefined,
      gstin: f.gstin.trim() || undefined,
      defaultCurrency: f.defaultCurrency || "INR",
      notes: f.notes.trim() || undefined,
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
    <div className="space-y-4">
      {/* AI Billing Assistant */}
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[var(--accent)] text-[13px] font-extrabold text-[var(--accent-ink)]">
              ✦
            </span>
            <div>
              <div className="text-[13px] font-bold text-[var(--text)]">AI Billing Assistant</div>
              <div className="text-[11.5px] text-[var(--text-dim)]">
                Paste an email, WhatsApp message, or signature — I&apos;ll fill the form for you to review.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAi((s) => !s)}
            className="text-[12px] font-semibold text-[var(--accent)] hover:underline"
          >
            {showAi ? "Hide" : "Use AI"}
          </button>
        </div>

        {showAi && (
          <div className="mt-3 space-y-2">
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              rows={5}
              placeholder={"Paste client details here…\n\ne.g. \"Hi, please invoice Zo World Pvt Ltd, GSTIN 29ABCDE1234F1Z5, 12 MG Road, Bengaluru, Karnataka 560001. Contact: Arjun Rao, arjun@zoworld.com, +91 98765 43210.\""}
              className={inp}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={runExtract}
                disabled={aiBusy || aiText.trim().length < 4}
                className="rounded-[10px] bg-[var(--accent)] px-4 py-2 text-[12.5px] font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {aiBusy ? "Reading…" : "Extract & fill"}
              </button>
              {aiText && (
                <button
                  type="button"
                  onClick={() => {
                    setAiText("");
                    setAiMsg("");
                  }}
                  className="text-[12px] text-[var(--text-mid)] hover:underline"
                >
                  Clear
                </button>
              )}
              {aiMsg && <span className="text-[12px] text-[var(--text-mid)]">{aiMsg}</span>}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>
              Contact name * <Conf score={conf.contactName} />
            </label>
            <input required className={inp} placeholder="Jane Doe" value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>
              Company <Conf score={conf.company} />
            </label>
            <input className={inp} placeholder="Acme Corp" value={f.company} onChange={(e) => set("company", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>
              Email <Conf score={conf.email} />
            </label>
            <input type="email" className={inp} placeholder="billing@example.com" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>
              Phone <Conf score={conf.phone} />
            </label>
            <input className={inp} placeholder="+91 98765 43210" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </div>

        <div>
          <label className={lbl}>
            Billing address <Conf score={conf.billingAddress} />
          </label>
          <textarea
            className={inp}
            rows={3}
            placeholder="123 Main St, City, State 560001"
            value={f.billingAddress}
            onChange={(e) => set("billingAddress", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>
              Country <Conf score={conf.country} />
            </label>
            <select className={inp} value={f.country} onChange={(e) => set("country", e.target.value)}>
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
            <label className={lbl}>
              Default currency <Conf score={conf.currency} />
            </label>
            <select className={inp} value={f.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          {f.country === "IN" && (
            <>
              <div>
                <label className={lbl}>
                  State <Conf score={conf.state} />
                </label>
                <select className={inp} value={f.stateCode} onChange={(e) => set("stateCode", e.target.value)}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>
                  GSTIN (B2B clients) <Conf score={conf.gstin} />
                </label>
                <input
                  className={inp}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                  title="15-character GST Identification Number"
                  value={f.gstin}
                  onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                />
              </div>
            </>
          )}
        </div>

        <div>
          <label className={lbl}>Notes</label>
          <textarea className={inp} rows={2} placeholder="Internal notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
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
    </div>
  );
}
