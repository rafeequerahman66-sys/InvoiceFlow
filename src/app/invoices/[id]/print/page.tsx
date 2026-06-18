export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DocumentSheet } from "@/components/document-sheet";
import { PrintBar } from "@/components/print-bar";
import { invoiceToSheet } from "@/lib/document";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, client: true },
  });
  if (!invoice) notFound();
  const business = await prisma.businessProfile.findUnique({ where: { id: "rinmedia" } });

  return (
    <div className="min-h-screen bg-[var(--app-bg)] py-8 print:bg-white print:py-0">
      <PrintBar downloadName={`${invoice.number.replace(/\//g, "-")}.pdf`} />
      <DocumentSheet
        data={invoiceToSheet(invoice)}
        business={business}
        watermark={invoice.status === "PAID" ? "PAID" : undefined}
      />
    </div>
  );
}
