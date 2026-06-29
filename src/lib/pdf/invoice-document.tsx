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
  accountType?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  branch?: string | null;
  upi?: string | null;
} | null;

// Indigo/purple palette to match the reference invoice.
const P = "#5b50e6"; // primary
const PINK = "#7c5cff";
const PL = "#f2f1fd"; // light lavender fill
const PLINE = "#e4e1fa"; // lavender border
const INK = "#1f2430";
const MUT = "#6b7280";
const FAINT = "#9ca3af";

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 70, paddingHorizontal: 32, fontSize: 9, color: INK, fontFamily: "Helvetica", lineHeight: 1.4 },

  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", color: P, letterSpacing: 0.5 },
  metaRow: { flexDirection: "row", marginTop: 4 },
  metaLabel: { color: MUT, width: 74, fontSize: 9 },
  metaVal: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  logoBox: { width: 60, height: 60, borderRadius: 8, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 15 },

  party: { flexDirection: "row", marginTop: 18, backgroundColor: PL, borderWidth: 1, borderColor: PLINE, borderRadius: 6 },
  partyCol: { flex: 1, padding: 12 },
  partyDivider: { borderRightWidth: 1, borderColor: PLINE },
  partyLabel: { color: P, fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 4 },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 2 },
  partyLine: { color: "#4b5563", fontSize: 8.5 },
  bold: { fontFamily: "Helvetica-Bold" },

  supply: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 8, marginTop: 12 },

  th: { flexDirection: "row", backgroundColor: P, color: "#fff", paddingVertical: 6, paddingHorizontal: 8, fontFamily: "Helvetica-Bold", fontSize: 8 },
  tr: { flexDirection: "row", backgroundColor: PL, paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: PLINE },
  cIdx: { width: 14 },
  cItem: { flex: 1, paddingRight: 6 },
  cSac: { width: 48, textAlign: "center" },
  cGst: { width: 34, textAlign: "right" },
  cQty: { width: 40, textAlign: "right" },
  cRate: { width: 52, textAlign: "right" },
  cAmt: { width: 58, textAlign: "right" },
  cTax: { width: 48, textAlign: "right" },
  cTot: { width: 58, textAlign: "right" },
  itemName: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  itemDesc: { color: MUT, fontSize: 8, marginTop: 1 },

  termsInItem: { marginTop: 8 },
  termsHead: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 2 },
  bullet: { flexDirection: "row", marginBottom: 1 },

  wordsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, alignItems: "flex-start" },
  words: { fontSize: 9, flex: 1, paddingRight: 12 },
  amtBox: { width: 200 },
  amtRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },

  lower: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, alignItems: "flex-start" },
  bankWrap: { flex: 1, paddingRight: 16 },
  bankHead: { color: P, fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 4 },
  bankRow: { flexDirection: "row", paddingVertical: 1.5 },
  bankLabel: { width: 90, color: MUT, fontSize: 8.5 },
  bankVal: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 8.5 },

  rightCol: { width: 210 },
  grand: { flexDirection: "row", justifyContent: "space-between", backgroundColor: P, color: "#fff", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4, fontFamily: "Helvetica-Bold", fontSize: 12 },
  sign: { alignItems: "center", marginTop: 26 },
  signLine: { width: 150, borderTopWidth: 1, borderColor: MUT, marginTop: 26, paddingTop: 3, textAlign: "center", color: MUT, fontSize: 8.5 },

  tnc: { marginTop: 24, borderTopWidth: 1, borderColor: PLINE, paddingTop: 10 },
  tncHead: { color: P, fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 4 },

  footer: { position: "absolute", bottom: 26, left: 32, right: 32, borderTopWidth: 1, borderColor: PLINE, borderStyle: "dashed", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footCell: { flexDirection: "column" },
  footLabel: { color: FAINT, fontSize: 7 },
  footVal: { fontSize: 8, fontFamily: "Helvetica-Bold" },
});

const COUNTRY: Record<string, string> = { IN: "India", US: "United States", GB: "United Kingdom", AE: "United Arab Emirates", DE: "Germany" };

/** First word of the brand, lowercased — mirrors the compact logo mark ("rin"). */
function logoMark(name: string): string {
  return (name.split(/\s+/)[0] || name).slice(0, 6).toLowerCase();
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ color: "#4b5563", fontSize: 8.5 }}>
      <Text style={{ fontFamily: "Helvetica-Bold", color: INK }}>{label} </Text>
      {value}
    </Text>
  );
}

export function InvoiceDocument({ invoice, business }: { invoice: PdfInvoice; business: PdfBusiness }) {
  const intra = invoice.supplyType === "INTRA_STATE";
  const cur = invoice.currency;
  const brand = business?.brandName ?? "Rin Media";
  const billedToName = invoice.client.company ?? invoice.client.name;
  const taxLabel = intra ? "GST" : "IGST";
  const countryName = COUNTRY[invoice.client.country ?? "IN"] ?? invoice.client.country ?? "India";
  const terms = (invoice.terms ?? "").split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
  const hasBank = business?.bankAccount || business?.bankName || business?.upi;
  const shortDate = invoice.issueDate;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>INVOICE</Text>
            <View style={{ marginTop: 6 }}>
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
          <View style={s.logoBox}>
            <Text style={s.logoText}>{logoMark(brand)}</Text>
          </View>
        </View>

        {/* Billed By / Billed To */}
        <View style={s.party}>
          <View style={[s.partyCol, s.partyDivider]}>
            <Text style={s.partyLabel}>Billed By</Text>
            <Text style={s.partyName}>
              {brand}
              {business?.legalName && business.legalName !== brand ? ` (${business.legalName})` : ""}
            </Text>
            {business?.address ? <Text style={s.partyLine}>{business.address}</Text> : null}
            {business?.gstin ? <Field label="GSTIN:" value={business.gstin} /> : null}
            {business?.email ? <Field label="Email:" value={business.email} /> : null}
            {business?.phone ? <Field label="Phone:" value={business.phone} /> : null}
          </View>
          <View style={s.partyCol}>
            <Text style={s.partyLabel}>Billed To</Text>
            <Text style={s.partyName}>{billedToName}</Text>
            {invoice.client.billingAddress ? <Text style={s.partyLine}>{invoice.client.billingAddress}</Text> : null}
            {invoice.client.gstin ? <Field label="GSTIN:" value={invoice.client.gstin} /> : null}
            {invoice.client.company && invoice.client.name !== invoice.client.company ? <Field label="Contact Person:" value={invoice.client.name} /> : null}
            {invoice.client.phone ? <Field label="Contact Phone:" value={invoice.client.phone} /> : null}
          </View>
        </View>

        {/* Supply */}
        <View style={s.supply}>
          <Field label="Country of Supply:" value={countryName} />
          <Field label="Place of Supply:" value={invoice.placeOfSupply || "—"} />
        </View>

        {/* Items table */}
        <View style={s.th}>
          <Text style={s.cIdx}> </Text>
          <Text style={s.cItem}>Item</Text>
          <Text style={s.cSac}>HSN/SAC</Text>
          <Text style={s.cGst}>GST Rate</Text>
          <Text style={s.cQty}>Quantity</Text>
          <Text style={s.cRate}>Rate</Text>
          <Text style={s.cAmt}>Amount</Text>
          <Text style={s.cTax}>{taxLabel}</Text>
          <Text style={s.cTot}>Total</Text>
        </View>
        {invoice.items.map((it, i) => {
          const amount = it.lineTotal - it.lineTax;
          const last = i === invoice.items.length - 1;
          return (
            <View style={s.tr} key={i} wrap={false}>
              <Text style={s.cIdx}>{i + 1}.</Text>
              <View style={s.cItem}>
                <Text style={s.itemName}>{it.name}</Text>
                {it.description ? <Text style={s.itemDesc}>{it.description}</Text> : null}
                {last && terms.length > 0 ? (
                  <View style={s.termsInItem}>
                    <Text style={s.termsHead}>Payment Terms:</Text>
                    {terms.map((t, j) => (
                      <View style={s.bullet} key={j}>
                        <Text style={{ width: 8 }}>•</Text>
                        <Text style={{ flex: 1, color: MUT, fontSize: 8 }}>{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
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

        {/* Words + Amount/Tax */}
        <View style={s.wordsRow}>
          <Text style={s.words}>
            <Text style={s.bold}>Total (in words): </Text>
            {amountInWords(invoice.total, cur).toUpperCase()}
          </Text>
          <View style={s.amtBox}>
            <View style={s.amtRow}>
              <Text style={{ color: MUT }}>Amount</Text>
              <Text>{formatMoney(invoice.taxableValue, cur)}</Text>
            </View>
            {intra ? (
              <>
                <View style={s.amtRow}>
                  <Text style={{ color: MUT }}>CGST</Text>
                  <Text>{formatMoney(invoice.cgst, cur)}</Text>
                </View>
                <View style={s.amtRow}>
                  <Text style={{ color: MUT }}>SGST</Text>
                  <Text>{formatMoney(invoice.sgst, cur)}</Text>
                </View>
              </>
            ) : (
              <View style={s.amtRow}>
                <Text style={{ color: MUT }}>IGST</Text>
                <Text>{formatMoney(invoice.igst, cur)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bank details + Total(INR) + signature */}
        <View style={s.lower}>
          <View style={s.bankWrap}>
            {hasBank ? (
              <>
                <Text style={s.bankHead}>Bank Details</Text>
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
                {business?.accountType ? (
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>Account Type</Text>
                    <Text style={s.bankVal}>{business.accountType}</Text>
                  </View>
                ) : null}
                {business?.bankName ? (
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>Bank</Text>
                    <Text style={s.bankVal}>{business.bankName}</Text>
                  </View>
                ) : null}
                {business?.upi ? (
                  <View style={s.bankRow}>
                    <Text style={s.bankLabel}>UPI</Text>
                    <Text style={s.bankVal}>{business.upi}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          <View style={s.rightCol}>
            <View style={s.grand}>
              <Text>Total ({cur})</Text>
              <Text>{formatMoney(invoice.total, cur)}</Text>
            </View>
            <View style={s.sign}>
              <Text style={s.signLine}>Authorised Signatory</Text>
            </View>
          </View>
        </View>

        {invoice.lutDeclaration ? (
          <Text style={[s.partyLine, { marginTop: 12 }]}>Supply meant for export of services under LUT without payment of IGST.</Text>
        ) : null}

        {invoice.notes ? <Text style={[s.partyLine, { marginTop: 12 }]}>{invoice.notes}</Text> : null}

        {/* Terms & Conditions */}
        <View style={s.tnc}>
          <Text style={s.tncHead}>Terms and Conditions</Text>
          <View style={s.bullet}>
            <Text style={{ width: 12 }}>1.</Text>
            <Text style={{ flex: 1, color: MUT, fontSize: 8.5 }}>Kindly mention Invoice Number while making payment.</Text>
          </View>
          {business?.email || business?.phone ? (
            <Text style={{ color: MUT, fontSize: 8.5, marginTop: 4 }}>
              For any enquiry, reach out
              {business?.email ? ` via email at ${business.email}` : ""}
              {business?.phone ? `, call on ${business.phone}` : ""}.
            </Text>
          ) : null}
        </View>

        {/* Per-page footer */}
        <View style={s.footer} fixed>
          <View style={s.footCell}>
            <Text style={s.footLabel}>Invoice No</Text>
            <Text style={s.footVal}>{invoice.number}</Text>
          </View>
          <View style={s.footCell}>
            <Text style={s.footLabel}>Invoice Date</Text>
            <Text style={s.footVal}>{shortDate}</Text>
          </View>
          <View style={[s.footCell, { flex: 1, marginLeft: 16 }]}>
            <Text style={s.footLabel}>Billed To</Text>
            <Text style={s.footVal}>{billedToName}</Text>
          </View>
          <Text style={{ color: FAINT, fontSize: 7.5 }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
