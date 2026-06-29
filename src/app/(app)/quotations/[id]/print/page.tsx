export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { DocumentSheet } from "@/components/document-sheet";
import { PrintBar } from "@/components/print-bar";
import { quoteToSheet, orgToBusiness } from "@/lib/document";

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireOrg();
  const quote = await prisma.quotation.findFirst({
    where: { id, orgId },
    include: { items: true, client: true, org: true },
  });
  if (!quote) notFound();

  return (
    <div className="min-h-screen bg-[var(--app-bg)] py-8 print:bg-white print:py-0">
      <PrintBar downloadName={`${quote.number.replace(/\//g, "-")}.pdf`} />
      <DocumentSheet data={quoteToSheet(quote)} business={orgToBusiness(quote.org)} />
    </div>
  );
}
