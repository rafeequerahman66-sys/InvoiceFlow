export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatMoney, toNum } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { DocumentLineTable } from "@/components/document-line-table";
import { QuoteActions } from "./quote-actions";
import { requireOrg } from "@/lib/tenant";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireOrg();
  const quote = await prisma.quotation.findFirst({
    where: { id, orgId },
    include: { items: true, client: true },
  });
  if (!quote) notFound();

  return (
    <AppShell title={quote.number} subtitle="Quotation" action={null}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/quotations" className="text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">
          ← Quotations
        </Link>
        <Badge tone={statusTone(quote.status)}>{quote.status}</Badge>
      </div>

      <div className="mb-4">
        <QuoteActions quoteId={quote.id} status={quote.status} convertedInvoiceId={quote.convertedInvoiceId} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>Line items</CardHeader>
          <CardBody>
            <DocumentLineTable items={quote.items} currency={quote.currency} />
            <div className="mt-4 flex justify-end">
              <div className="w-56 space-y-1.5 text-[13px]">
                <Row k="Subtotal" v={formatMoney(toNum(quote.subtotal), quote.currency)} />
                <Row k="Tax" v={formatMoney(toNum(quote.totalTax), quote.currency)} />
                <div className="flex justify-between border-t border-[var(--divider)] pt-2 text-[15px] font-extrabold text-[var(--text)]">
                  <span>Total</span>
                  <span className="tnum">{formatMoney(toNum(quote.total), quote.currency)}</span>
                </div>
              </div>
            </div>
            {quote.notes && <p className="mt-4 whitespace-pre-wrap text-[12px] text-[var(--text-dim)]">{quote.notes}</p>}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>Client</CardHeader>
            <CardBody className="text-[13px]">
              <div className="font-semibold text-[var(--text)]">{quote.client.company ?? quote.client.name}</div>
              {quote.client.company && <div className="text-[var(--text-dim)]">{quote.client.name}</div>}
              {quote.client.email && <div className="text-[var(--text-dim)]">{quote.client.email}</div>}
              {quote.client.gstin && (
                <div className="mt-1 font-mono text-[12px] text-[var(--text-dim)]">GSTIN {quote.client.gstin}</div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Details</CardHeader>
            <CardBody className="space-y-1 text-[13px]">
              <Row k="Issue date" v={quote.issueDate.toISOString().slice(0, 10)} />
              <Row k="Valid till" v={quote.validTill.toISOString().slice(0, 10)} />
              <Row k="Supply type" v={quote.supplyType} />
              <Row k="Currency" v={quote.currency} />
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
