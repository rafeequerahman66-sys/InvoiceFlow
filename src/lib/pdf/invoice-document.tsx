/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/money";
import { amountInWords } from "@/lib/amount-in-words";

export type PdfInvoice = {
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  supplyType: string;
  placeOfSupply?: string | null;
  taxableValue: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  lutDeclaration?: boolean;
  client: {
    name: string;
    company?: string | null;
    gstin?: string | null;
    billingAddress?: string | null;
    phone?: string | null;
    country?: string | null;
  };
  items: Array<{ name: string; description?: string | null; sacCode?: string | null; qty: number; rate: number; taxRate: number; lineTax: number; lineTotal: number }>;
};

export type PdfBusiness = {
  brandName: string;
  legalName: string;
  gstin: string;
  address: string;
  email: string;
  phone?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  branch?: string | null;
  upi?: string | null;
} | null;

const C = {
  ink: "#18181b",
  mut: "#6b7280",
  faint: "#9ca3af",
  line: "#e5e7eb",
  band: "#f3f4f6",
  head: "#111827",
};

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 56, paddingHorizontal: 34, fontSize: 9, color: C.ink, fontFamily: "Helvetica", lineHeight: 1.45 },
  accentBar: { height: 4, backgroundColor: "#f6d94e", marginBottom: 14, marginHorizontal: -34, marginTop: -34 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, color: C.head },
  metaTable: { marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "flex-end" },
  metaLabel: { color: C.mut, fontSize: 8.5, width: 70, textAlign: "right" },
  metaVal: { fontFamily: "Helvetica-Bold", width: 95, textAlign: "right" },

  partyWrap: { flexDirection: "row", marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: 4 },
  partyCol: { flex: 1, padding: 10 },
  partyDivider: { borderRightWidth: 1, borderColor: C.line },
  partyLabel: { color: C.mut, fontSize: 8, marginBottom: 3 },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 2 },
  partyLine: { color: C.mut, fontSize: 8.5 },

  supply: { flexDirection: "row", justifyContent: "center", backgroundColor: C.band, paddingVertical: 5, marginTop: 10, borderRadius: 4 },
  supplyItem: { marginHorizontal: 14, fontSize: 8.5 },

  th: { flexDirection: "row", backgroundColor: C.head, color: "#fff", paddingVertical: 5, paddingHorizontal: 6, marginTop: 16, fontFamily: "Helvetica-Bold", fontSize: 8 },
  tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: C.line },
  cIdx: { width: 16 },
  cItem: { flex: 1, paddingRight: 6 },
  cSac: { width: 46 },
  cGst: { width: 32, textAlign: "right" },
  cQty: { width: 26, textAlign: "right" },
  cRate: { width: 52, textAlign: "right" },
  cAmt: { width: 58, textAlign: "right" },
  cTax: { width: 52, textAlign: "right" },
  cTot: { width: 60, textAlign: "right" },
  itemName: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  itemDesc: { color: C.mut, fontSize: 8, marginTop: 1 },

  bottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  bottomLeft: { width: 270 },
  totalsBox: { width: 200 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { flexDirection: "row", justifyContent: "space-between", backgroundColor: C.head, color: "#fff", paddingVertical: 6, paddingHorizontal: 8, marginTop: 4, fontFamily: "Helvetica-Bold", fontSize: 11, borderRadius: 3 },

  sectionLabel: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 4 },
  words: { fontSize: 9 },
  wordsVal: { fontFamily: "Helvetica-Bold" },

  bankGrid: { marginTop: 2 },
  bankRow: { flexDirection: "row", paddingVertical: 1.5 },
  bankLabel: { width: 86, color: C.mut, fontSize: 8.5 },
  bankVal: { flex: 1, fontSize: 8.5 },

  bullet: { flexDirection: "row", marginBottom: 1.5 },

  sign: { alignItems: "flex-end", marginTop: 26 },
  signLine: { width: 150, borderTopWidth: 1, borderColor: C.mut, marginTop: 28, paddingTop: 3, textAlign: "center", color: C.mut, fontSize: 8 },

  footer: { position: "absolute", bottom: 22, left: 34, right: 34, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: C.line, paddingTop: 6, fontSize: 7.5, color: C.faint },
});

const COUNTRY: Record<string, string> = { IN: "India", US: "United States", GB: "United Kingdom", AE: "United Arab Emirates", DE: "Germany" };

export function InvoiceDocument({ invoice, business }: { invoice: PdfInvoice; business: PdfBusiness }) {
  const intra = invoice.supplyType === "INTRA_STATE";
  const cur = invoice.currency;
  const billedToName = invoice.client.company ?? invoice.client.name;
  const taxLabel = intra ? "GST" : "IGST";
  const totalTax = intra ? invoice.cgst + invoice.sgst : invoice.igst;
  const countryName = COUNTRY[invoice.client.country ?? "IN"] ?? invoice.client.country ?? "India";
  const terms = (invoice.terms ?? "").split(/\r?\n/).map((t) => t.trim()).filter(Boolean);

  const hasBank = business?.bankAccount || business?.bankName || business?.upi;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} fixed />

        {/* Header */}
        <View style={s.between}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>TAX INVOICE</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 6 }}>{business?.brandName ?? "Rin Media"}</Text>
            {business?.legalName ? <Text style={s.partyLine}>{business.legalName}</Text> : null}
          </View>
          <View style={s.metaTable}>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Invoice No</Text>
              <Text style={s.metaVal}>{invoice.number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Invoice Date</Text>
              <Text style={s.metaVal}>{invoice.issueDate}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Due Date</Text>
              <Text style={s.metaVal}>{invoice.dueDate}</Text>
            </View>
          </View>
        </View>

        {/* Billed By / Billed To */}
        <View style={s.partyWrap}>
          <View style={[s.partyCol, s.partyDivider]}>
            <Text style={s.partyLabel}>Billed By</Text>
            <Text style={s.partyName}>{business?.brandName ?? "Rin Media"}</Text>
            {business?.address ? <Text style={s.partyLine}>{business.address}</Text> : null}
            {business?.gstin ? <Text style={s.partyLine}>GSTIN: {business.gstin}</Text> : null}
            {business?.email ? <Text style={s.partyLine}>Email: {business.email}</Text> : null}
            {business?.phone ? <Text style={s.partyLine}>Phone: {business.phone}</Text> : null}
          </View>
          <View style={s.partyCol}>
            <Text style={s.partyLabel}>Billed To</Text>
            <Text style={s.partyName}>{billedToName}</Text>
            {invoice.client.billingAddress ? <Text style={s.partyLine}>{invoice.client.billingAddress}</Text> : null}
            {invoice.client.gstin ? <Text style={s.partyLine}>GSTIN: {invoice.client.gstin}</Text> : null}
            {invoice.client.company && invoice.client.name !== invoice.client.company ? (
              <Text style={s.partyLine}>Contact: {invoice.client.name}</Text>
            ) : null}
            {invoice.client.phone ? <Text style={s.partyLine}>Phone: {invoice.client.phone}</Text> : null}
          </View>
        </View>

        {/* Supply */}
        <View style={s.supply}>
          <Text style={s.supplyItem}>Country of Supply: <Text style={{ fontFamily: "Helvetica-Bold" }}>{countryName}</Text></Text>
          <Text style={s.supplyItem}>Place of Supply: <Text style={{ fontFamily: "Helvetica-Bold" }}>{invoice.placeOfSupply || "—"}</Text></Text>
        </View>

        {/* Items table */}
        <View style={s.th}>
          <Text style={s.cIdx}>#</Text>
          <Text style={s.cItem}>Item</Text>
          <Text style={s.cSac}>HSN/SAC</Text>
          <Text style={s.cGst}>GST%</Text>
          <Text style={s.cQty}>Qty</Text>
          <Text style={s.cRate}>Rate</Text>
          <Text style={s.cAmt}>Amount</Text>
          <Text style={s.cTax}>{taxLabel}</Text>
          <Text style={s.cTot}>Total</Text>
        </View>
        {invoice.items.map((it, i) => {
          const amount = it.lineTotal - it.lineTax;
          return (
            <View style={s.tr} key={i} wrap={false}>
              <Text style={s.cIdx}>{i + 1}</Text>
              <View style={s.cItem}>
                <Text style={s.itemName}>{it.name}</Text>
                {it.description ? <Text style={s.itemDesc}>{it.description}</Text> : null}
              </View>
              <Text style={s.cSac}>{it.sacCode || "—"}</Text>
              <Text style={s.cGst}>{it.taxRate}%</Text>
              <Text style={s.cQty}>{it.qty}</Text>
              <Text style={s.cRate}>{formatMoney(it.rate, cur)}</Text>
              <Text style={s.cAmt}>{formatMoney(amount, cur)}</Text>
              <Text style={s.cTax}>{formatMoney(it.lineTax, cur)}</Text>
              <Text style={s.cTot}>{formatMoney(it.lineTotal, cur)}</Text>
            </View>
          );
        })}

        {/* Words + Totals */}
        <View style={s.bottom}>
          <View style={s.bottomLeft}>
            <Text style={s.words}>
              Total (in words): <Text style={s.wordsVal}>{amountInWords(invoice.total, cur).toUpperCase()}</Text>
            </Text>
          </View>
          <View style={s.totalsBox}>
            <View style={s.totRow}>
              <Text style={{ color: C.mut }}>Amount</Text>
              <Text>{formatMoney(invoice.taxableValue, cur)}</Text>
            </View>
            {intra ? (
              <>
                <View style={s.totRow}>
                  <Text style={{ color: C.mut }}>CGST</Text>
                  <Text>{formatMoney(invoice.cgst, cur)}</Text>
                </View>
                <View style={s.totRow}>
                  <Text style={{ color: C.mut }}>SGST</Text>
                  <Text>{formatMoney(invoice.sgst, cur)}</Text>
                </View>
              </>
            ) : (
              <View style={s.totRow}>
                <Text style={{ color: C.mut }}>IGST</Text>
                <Text>{formatMoney(totalTax, cur)}</Text>
              </View>
            )}
            <View style={s.grand}>
              <Text>Total ({cur})</Text>
              <Text>{formatMoney(invoice.total, cur)}</Text>
            </View>
          </View>
        </View>

        {invoice.lutDeclaration ? (
          <Text style={[s.partyLine, { marginTop: 12 }]}>Supply meant for export of services under LUT without payment of IGST.</Text>
        ) : null}

        {/* Payment terms + Bank details */}
        <View style={[s.between, { marginTop: 18 }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            {terms.length > 0 ? (
              <>
                <Text style={s.sectionLabel}>Payment Terms</Text>
                {terms.map((t, i) => (
                  <View style={s.bullet} key={i}>
                    <Text style={{ width: 8 }}>•</Text>
                    <Text style={{ flex: 1, color: C.mut, fontSize: 8.5 }}>{t}</Text>
                  </View>
                ))}
              </>
            ) : null}
            {invoice.notes ? <Text style={[s.partyLine, { marginTop: terms.length ? 8 : 0 }]}>{invoice.notes}</Text> : null}
          </View>

          {hasBank ? (
            <View style={{ width: 240 }}>
              <Text style={s.sectionLabel}>Bank Details</Text>
              <View style={s.bankGrid}>
                {business?.accountName ? (
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>Account Name</Text>
                    <Text style={s.bankVal}>{business.accountName}</Text>
                  </View>
                ) : null}
                {business?.bankAccount ? (
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>Account Number</Text>
                    <Text style={s.bankVal}>{business.bankAccount}</Text>
                  </View>
                ) : null}
                {business?.ifsc ? (
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>IFSC</Text>
                    <Text style={s.bankVal}>{business.ifsc}</Text>
                  </View>
                ) : null}
                {business?.bankName ? (
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>Bank</Text>
                    <Text style={s.bankVal}>{business.bankName}</Text>
                  </View>
                ) : null}
                {business?.branch ? (
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>Branch</Text>
                    <Text style={s.bankVal}>{business.branch}</Text>
                  </View>
                ) : null}
                {business?.upi ? (
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>UPI</Text>
                    <Text style={s.bankVal}>{business.upi}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        {/* Signatory */}
        <View style={s.sign}>
          <Text style={s.signLine}>Authorised Signatory</Text>
        </View>

        {/* Per-page footer */}
        <View style={s.footer} fixed>
          <Text>{invoice.number} · {invoice.issueDate} · {billedToName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
