import { AppShell } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Icon } from "@/components/icon";

const STEPS = [
  { n: "1", label: "Import bank statement", desc: "Upload a CSV or OFX export from your bank portal." },
  { n: "2", label: "Auto-match transactions", desc: "InvoiceFlow matches credits to paid invoices automatically." },
  { n: "3", label: "Review unmatched items", desc: "Manually link or mark transactions as non-invoice receipts." },
  { n: "4", label: "Close the period", desc: "Lock the reconciled period and export a summary report." },
];

export default function ReconciliationPage() {
  return (
    <AppShell title="Bank Reconciliation" subtitle="Match bank transactions with invoices">
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-8 text-center">
              <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--card-inset)] text-[var(--accent)]">
                <Icon name="git-merge" size={26} />
              </span>
              <h2 className="text-[16px] font-bold text-[var(--text)]">Reconciliation coming soon</h2>
              <p className="mt-2 max-w-sm text-[12.5px] text-[var(--text-dim)]">
                Import your bank statement and let InvoiceFlow automatically match payments to open
                invoices — closing your books in minutes instead of hours.
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-2">
          <div className="px-1 text-[11px] font-bold uppercase tracking-widest text-[var(--text-faint)]">How it will work</div>
          {STEPS.map((s) => (
            <Card key={s.n} className="flex gap-4 p-4 opacity-70">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--card-inset)] text-[12px] font-bold text-[var(--accent)]">
                {s.n}
              </span>
              <div>
                <div className="text-[13px] font-semibold text-[var(--text-mid)]">{s.label}</div>
                <div className="text-[12px] text-[var(--text-dim)]">{s.desc}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
