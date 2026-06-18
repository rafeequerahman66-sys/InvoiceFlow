export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DocumentSheet } from "@/components/document-sheet";
import { PrintBar } from "@/components/print-bar";
import { quoteToSheet } from "@/lib/document";

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true, client: true },
  });
  if (!quote) notFound();
  const business = await prisma.businessProfile.findUnique({ where: { id: "rinmedia" } });

  return (
    <div className="min-h-screen bg-[var(--app-bg)] py-8 print:bg-white print:py-0">
      <PrintBar downloadName={`${quote.number.replace(/\//g, "-")}.pdf`} />
      <DocumentSheet data={quoteToSheet(quote)} business={business} />
    </div>
  );
}
