import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { toNum } from "@/lib/money";

/**
 * Self-contained PDF generation via @react-pdf/renderer (no external service).
 *
 * GET /api/pdf?invoiceId=... → application/pdf
 *
 * Note: @react-pdf/renderer is declared in next.config `serverExternalPackages`
 * so it runs in the Node runtime. If it ever fails on this Next/React combo,
 * the print-optimized page at /invoices/[id]/print is the equivalent fallback.
 */
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { orgId } = await requireOrg();
  const id = req.nextUrl.searchParams.get("invoiceId");
  if (!id) return new NextResponse("invoiceId required", { status: 400 });

  const invoice = await prisma.invoice.findFirst({
    where: { id, orgId },
    include: { items: true, client: true, org: true, bankAccount: true },
  });
  if (!invoice) return new NextResponse("Not found", { status: 404 });
  const profile = invoice.org;
  const bank = invoice.bankAccount;

  try {
    // Imported lazily so a load failure can't crash unrelated routes.
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { InvoiceDocument } = await import("@/lib/pdf/invoice-document");

    const buffer = await renderToBuffer(
      InvoiceDocument({
        business: profile
          ? {
              brandName: profile.name,
              legalName: profile.legalName ?? profile.name,
              gstin: profile.gstin ?? "",
              address: profile.address ?? "",
              email: profile.email ?? "",
              phone: profile.phone,
              // Prefer the bank account pinned on the invoice; fall back to the
              // org's legacy single-bank fields.
              bankName: bank?.bankName ?? profile.bankName,
              accountName: bank?.accountName ?? null,
              bankAccount: bank?.accountNumber ?? profile.bankAccount,
              ifsc: bank?.ifsc ?? profile.ifsc,
              branch: bank?.branch ?? null,
              upi: bank?.upi ?? null,
            }
          : null,
        invoice: {
          number: invoice.number,
          issueDate: invoice.issueDate.toISOString().slice(0, 10),
          dueDate: invoice.dueDate.toISOString().slice(0, 10),
          currency: invoice.currency,
          supplyType: invoice.supplyType,
          placeOfSupply: invoice.placeOfSupply,
          taxableValue: toNum(invoice.taxableValue),
          subtotal: toNum(invoice.subtotal),
          cgst: toNum(invoice.cgst),
          sgst: toNum(invoice.sgst),
          igst: toNum(invoice.igst),
          total: toNum(invoice.total),
          notes: invoice.notes,
          terms: invoice.terms,
          lutDeclaration: invoice.lutDeclaration,
          client: {
            name: invoice.client.name,
            company: invoice.client.company,
            gstin: invoice.client.gstin,
            billingAddress: invoice.client.billingAddress,
            phone: invoice.client.phone,
            country: invoice.client.country,
          },
          items: invoice.items.map((it) => ({
            name: it.name,
            description: it.description,
            sacCode: it.sacCode,
            qty: toNum(it.qty),
            rate: toNum(it.rate),
            taxRate: toNum(it.taxRate),
            lineTax: toNum(it.lineTax),
            lineTotal: toNum(it.lineTotal),
          })),
        },
      })
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.number.replace(/\//g, "-")}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "PDF renderer failed; use the print view fallback.",
        fallback: `/invoices/${id}/print`,
        detail: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
