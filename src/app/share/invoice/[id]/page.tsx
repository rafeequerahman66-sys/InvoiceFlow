export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DocumentSheet } from "@/components/document-sheet";
import { invoiceToSheet } from "@/lib/document";

/** Public, unauthenticated read-only invoice view (keyed on the cuid id). */
export default async function PublicInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, client: true },
  });
  if (!invoice || invoice.status === "DRAFT") notFound();

  const business = await prisma.businessProfile.findUnique({ where: { id: "rinmedia" } });

  return (
    <div className="min-h-screen bg-[var(--app-bg)] py-8">
      <DocumentSheet
        data={invoiceToSheet(invoice)}
        business={business}
        watermark={invoice.status === "PAID" ? "PAID" : undefined}
      />
      <p className="mx-auto mt-4 max-w-[720px] text-center text-[12px] text-[var(--text-faint)]">
        Powered by InvoiceFlow · Rin Media
      </p>
    </div>
  );
}
