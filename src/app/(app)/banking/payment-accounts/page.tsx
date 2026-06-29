export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/icon";

const METHODS = [
  {
    icon: "bank" as const,
    title: "Bank Transfer",
    desc: "NEFT / RTGS / IMPS — add your account details under Bank Accounts.",
    status: "active",
    statusLabel: "Active",
  },
  {
    icon: "credit-card" as const,
    title: "UPI",
    desc: "Accept payments via any UPI app — PhonePe, GPay, Paytm, BHIM.",
    status: "active",
    statusLabel: "Active",
  },
  {
    icon: "send" as const,
    title: "Razorpay / Stripe",
    desc: "Generate a payment link and attach it to invoices automatically.",
    status: "soon",
    statusLabel: "Coming soon",
  },
  {
    icon: "repeat" as const,
    title: "Payment Links",
    desc: "One-click shareable links your clients can pay without logging in.",
    status: "soon",
    statusLabel: "Coming soon",
  },
];

export default function PaymentAccountsPage() {
  return (
    <AppShell title="Payment Accounts" subtitle="Payment methods you accept from clients">
      <div className="max-w-2xl space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {METHODS.map((m) => (
            <Card key={m.title} className="relative p-5">
              <div className="mb-3 flex items-start justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--card-inset)] text-[var(--accent)]">
                  <Icon name={m.icon} size={18} />
                </span>
                <span
                  className={
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold " +
                    (m.status === "active"
                      ? "bg-[rgba(116,217,160,.12)] text-[var(--positive)]"
                      : "bg-[var(--card-inset)] text-[var(--text-dim)]")
                  }
                >
                  {m.statusLabel}
                </span>
              </div>
              <div className="text-[13.5px] font-semibold text-[var(--text)]">{m.title}</div>
              <div className="mt-1 text-[12px] text-[var(--text-dim)]">{m.desc}</div>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>Payment instructions on invoices</CardHeader>
          <CardBody>
            <p className="text-[12.5px] text-[var(--text-dim)]">
              Bank account and UPI details are printed at the bottom of every invoice PDF. Configure
              them under <strong className="text-[var(--text-mid)]">Bank Accounts</strong>. Online
              payment gateways will be available soon.
            </p>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
