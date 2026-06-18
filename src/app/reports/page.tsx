import { AppShell } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <AppShell title="Reports & Analytics" subtitle="Revenue, GST & client reports" action={null}>
      <Card>
        <CardBody className="py-16 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[14px] bg-[var(--card-inset)] text-[var(--accent)]">
            ▦
          </div>
          <div className="text-[15px] font-bold text-[var(--text)]">Reports are on the roadmap</div>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-[var(--text-dim)]">
            Revenue-by-month, GST summary (CGST/SGST/IGST), top clients, and CSV/Excel export will live here. The
            underlying invoice & payment data is already captured.
          </p>
        </CardBody>
      </Card>
    </AppShell>
  );
}
