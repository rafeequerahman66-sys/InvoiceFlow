export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatMoney, toNum } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { DocumentLineTable } from "@/components/document-line-table";
import { InvoiceActions } from "./invoice-actions";
import { requireOrg } from "@/lib/tenant";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireOrg();
  const invoice = await prisma.invoice.findFirst({
    where: { id, orgId },
    include: { items: true, client: true, payments: { orderBy: { paidAt: "desc" } } },
  });
  if (!invoice) notFound();

  const paid = invoice.payments.reduce((s, p) => s + toNum(p.amount), 0);
  const balance = Math.max(0, toNum(invoice.total) - paid);
  const intra = invoice.supplyType === "INTRA_STATE";

  return (
    <AppShell title={invoice.number} subtitle="Invoice" action={null}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/invoices" className="text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">
          ← Invoices
        </Link>
        <div className="flex items-center gap-3">
          <Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>
        </div>
      </div>

      <div className="mb-4">
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} balance={balance} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>Line items</CardHeader>
          <CardBody>
            <DocumentLineTable items={invoice.items} currency={invoice.currency} />
            <div className="mt-4 flex justify-end">
              <div className="w-60 space-y-1.5 text-[13px]">
                <Row k="Subtotal" v={formatMoney(toNum(invoice.subtotal), invoice.currency)} />
                {toNum(invoice.discountValue) > 0 && (
                  <Row k="Discount" v={invoice.discountType === "PERCENT" ? `${toNum(invoice.discountValue)}%` : "flat"} />
                )}
                {intra ? (
                  <>
                    <Row k="CGST" v={formatMoney(toNum(invoice.cgst), invoice.currency)} />
                    <Row k="SGST" v={formatMoney(toNum(invoice.sgst), invoice.currency)} />
                  </>
                ) : (
                  <Row k="IGST" v={formatMoney(toNum(invoice.igst), invoice.currency)} />
                )}
                <div className="flex justify-between border-t border-[var(--divider)] pt-2 text-[15px] font-extrabold text-[var(--text)]">
                  <span>Total</span>
                  <span className="tnum">{formatMoney(toNum(invoice.total), invoice.currency)}</span>
                </div>
                {paid > 0 && (
                  <>
                    <Row k="Paid" v={formatMoney(paid, invoice.currency)} />
                    <Row k="Balance" v={formatMoney(balance, invoice.currency)} />
                  </>
                )}
              </div>
            </div>
            {invoice.lutDeclaration && (
              <p className="mt-4 rounded-[10px] border border-[#34301a] bg-[rgba(246,217,78,.08)] p-2.5 text-[12px] text-[var(--accent)]">
                Supply meant for export under LUT — no IGST charged (Bond/LUT in lieu of IGST).
              </p>
            )}
            {invoice.notes && (
              <p className="mt-4 whitespace-pre-wrap text-[12px] text-[var(--text-dim)]">{invoice.notes}</p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>Client</CardHeader>
            <CardBody className="text-[13px]">
              <div className="font-semibold text-[var(--text)]">{invoice.client.company ?? invoice.client.name}</div>
              {invoice.client.company && <div className="text-[var(--text-dim)]">{invoice.client.name}</div>}
              {invoice.client.email && <div className="text-[var(--text-dim)]">{invoice.client.email}</div>}
              {invoice.client.gstin && (
                <div className="mt-1 font-mono text-[12px] text-[var(--text-dim)]">GSTIN {invoice.client.gstin}</div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Details</CardHeader>
            <CardBody className="space-y-1 text-[13px]">
              <Row k="Issue date" v={invoice.issueDate.toISOString().slice(0, 10)} />
              <Row k="Due date" v={invoice.dueDate.toISOString().slice(0, 10)} />
              <Row k="Supply type" v={invoice.supplyType} />
              <Row k="Place of supply" v={invoice.placeOfSupply ?? "—"} />
              <Row k="Currency" v={invoice.currency} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Payments</CardHeader>
            <CardBody className="text-[13px]">
              {invoice.payments.length === 0 ? (
                <div className="text-[var(--text-dim)]">No payments recorded.</div>
              ) : (
                <ul className="space-y-2">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <span className="text-[var(--text-dim)]">
                        {p.paidAt.toISOString().slice(0, 10)} · {p.method.replace("_", " ")}
                      </span>
                      <span className="tnum">{formatMoney(toNum(p.amount), p.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[var(--text-soft)]">
      <span>{k}</span>
      <span className="tnum text-[var(--text-mid)]">{v}</span>
    </div>
  );
}
