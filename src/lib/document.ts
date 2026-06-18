import type { SheetData } from "@/components/document-sheet";

type InvoiceWithRels = {
  number: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  supplyType: string;
  placeOfSupply: string | null;
  subtotal: unknown;
  discountType: string;
  discountValue: unknown;
  cgst: unknown;
  sgst: unknown;
  igst: unknown;
  total: unknown;
  notes: string | null;
  terms: string | null;
  lutDeclaration: boolean;
  items: SheetData["items"];
  client: SheetData["client"];
};

type QuoteWithRels = {
  number: string;
  issueDate: Date;
  validTill: Date;
  currency: string;
  supplyType: string;
  subtotal: unknown;
  discountType: string;
  discountValue: unknown;
  totalTax: unknown;
  total: unknown;
  notes: string | null;
  terms: string | null;
  items: SheetData["items"];
  client: SheetData["client"];
};

const d = (date: Date) => date.toISOString().slice(0, 10);

export function invoiceToSheet(inv: InvoiceWithRels): SheetData {
  return {
    kind: "INVOICE",
    number: inv.number,
    issueDate: d(inv.issueDate),
    secondaryDateLabel: "Due date",
    secondaryDate: d(inv.dueDate),
    currency: inv.currency,
    supplyType: inv.supplyType,
    placeOfSupply: inv.placeOfSupply,
    items: inv.items,
    subtotal: inv.subtotal,
    discountType: inv.discountType,
    discountValue: inv.discountValue,
    cgst: inv.cgst,
    sgst: inv.sgst,
    igst: inv.igst,
    total: inv.total,
    notes: inv.notes,
    terms: inv.terms,
    lutDeclaration: inv.lutDeclaration,
    client: inv.client,
  };
}

export function quoteToSheet(q: QuoteWithRels): SheetData {
  return {
    kind: "QUOTE",
    number: q.number,
    issueDate: d(q.issueDate),
    secondaryDateLabel: "Valid till",
    secondaryDate: d(q.validTill),
    currency: q.currency,
    supplyType: q.supplyType,
    items: q.items,
    subtotal: q.subtotal,
    discountType: q.discountType,
    discountValue: q.discountValue,
    totalTax: q.totalTax,
    total: q.total,
    notes: q.notes,
    terms: q.terms,
    client: q.client,
  };
}
