export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { DocumentSheet } from "@/components/document-sheet";
import { PrintBar } from "@/components/print-bar";
import { invoiceToSheet, orgToBusiness } from "@/lib/document";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireOrg();
  const invoice = await prisma.invoice.findFirst({
    where: { id, orgId },
    include: { items: true, client: true, org: true },
  });
  if (!invoice) notFound();

  return (
    <div className="min-h-screen bg-[var(--app-bg)] py-8 print:bg-white print:py-0">
      <PrintBar downloadName={`${invoice.number.replace(/\//g, "-")}.pdf`} />
      <DocumentSheet
        data={invoiceToSheet(invoice)}
        business={orgToBusiness(invoice.org)}
        watermark={invoice.status === "PAID" ? "PAID" : undefined}
      />
    </div>
  );
}
