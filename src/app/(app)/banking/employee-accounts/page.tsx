import { AppShell } from "@/components/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/icon";

const FEATURES = [
  { icon: "user-check" as const, label: "Employee profiles", desc: "Store salary, role, and bank details per employee." },
  { icon: "repeat" as const, label: "Recurring payroll", desc: "Auto-generate payslips on a monthly or custom schedule." },
  { icon: "file-text" as const, label: "Payslip PDFs", desc: "Branded payslip documents ready to email or download." },
  { icon: "bar-chart" as const, label: "Payroll reports", desc: "Monthly and annual summaries with TDS breakdowns." },
];

export default function EmployeeAccountsPage() {
  return (
    <AppShell title="Employee Accounts" subtitle="Payroll and salary management">
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-8 text-center">
              <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--card-inset)] text-[var(--accent)]">
                <Icon name="user-check" size={26} />
              </span>
              <h2 className="text-[16px] font-bold text-[var(--text)]">Payroll is on the roadmap</h2>
              <p className="mt-2 max-w-sm text-[12.5px] text-[var(--text-dim)]">
                Manage employee salaries, generate payslips, and track payroll expenses — all inside
                InvoiceFlow. Coming in a future update.
              </p>
              <div className="mt-4 rounded-[8px] bg-[rgba(246,217,78,.08)] px-4 py-2 text-[12px] font-semibold text-[var(--accent)]">
                Notify me when available
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.label} className="p-4 opacity-60">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[var(--card-inset)] text-[var(--text-mid)]">
                  <Icon name={f.icon} size={16} />
                </span>
                <span className="text-[13px] font-semibold text-[var(--text-mid)]">{f.label}</span>
              </div>
              <p className="text-[12px] text-[var(--text-dim)]">{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
