/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatMoney, toNum } from "@/lib/money";

export type PdfInvoice = {
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  supplyType: string;
  placeOfSupply?: string | null;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  notes?: string | null;
  lutDeclaration?: boolean;
  client: { name: string; company?: string | null; gstin?: string | null; billingAddress?: string | null };
  items: Array<{ name: string; qty: number; rate: number; taxRate: number; lineTotal: number }>;
};

export type PdfBusiness = {
  brandName: string;
  legalName: string;
  gstin: string;
  address: string;
  email: string;
  bankName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
} | null;

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: "#18181b", fontFamily: "Helvetica" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "right" },
  muted: { color: "#71717a" },
  section: { marginTop: 16 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#d4d4d8", paddingBottom: 4, fontFamily: "Helvetica-Bold" },
  td: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#f4f4f5", paddingVertical: 4 },
  cName: { flex: 4 },
  cNum: { flex: 1, textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: "#a1a1aa", marginTop: 3, paddingTop: 3, fontFamily: "Helvetica-Bold", fontSize: 11 },
});

export function InvoiceDocument({ invoice, business }: { invoice: PdfInvoice; business: PdfBusiness }) {
  const intra = invoice.supplyType === "INTRA_STATE";
  const cur = invoice.currency;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View>
            <Text style={s.brand}>{business?.brandName ?? "Rin Media"}</Text>
            <Text style={s.muted}>{business?.legalName}</Text>
            <Text style={s.muted}>{business?.address}</Text>
            {business?.gstin ? <Text>GSTIN: {business.gstin}</Text> : null}
          </View>
          <View>
            <Text style={s.title}>TAX INVOICE</Text>
            <Text style={{ textAlign: "right" }}>{invoice.number}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>Issue: {invoice.issueDate}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>Due: {invoice.dueDate}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.muted}>BILL TO</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{invoice.client.company ?? invoice.client.name}</Text>
          {invoice.client.billingAddress ? <Text style={s.muted}>{invoice.client.billingAddress}</Text> : null}
          {invoice.client.gstin ? <Text>GSTIN: {invoice.client.gstin}</Text> : null}
          <Text style={s.muted}>Supply: {invoice.supplyType}{invoice.placeOfSupply ? ` · ${invoice.placeOfSupply}` : ""}</Text>
        </View>

        <View style={s.section}>
          <View style={s.th}>
            <Text style={s.cName}>Item</Text>
            <Text style={s.cNum}>Qty</Text>
            <Text style={s.cNum}>Rate</Text>
            <Text style={s.cNum}>Tax%</Text>
            <Text style={s.cNum}>Amount</Text>
          </View>
          {invoice.items.map((it, i) => (
            <View style={s.td} key={i}>
              <Text style={s.cName}>{it.name}</Text>
              <Text style={s.cNum}>{it.qty}</Text>
              <Text style={s.cNum}>{formatMoney(toNum(it.rate), cur)}</Text>
              <Text style={s.cNum}>{it.taxRate}%</Text>
              <Text style={s.cNum}>{formatMoney(toNum(it.lineTotal), cur)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{formatMoney(invoice.subtotal, cur)}</Text>
          </View>
          {intra ? (
            <>
              <View style={s.totalRow}>
                <Text style={s.muted}>CGST</Text>
                <Text>{formatMoney(invoice.cgst, cur)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.muted}>SGST</Text>
                <Text>{formatMoney(invoice.sgst, cur)}</Text>
              </View>
            </>
          ) : (
            <View style={s.totalRow}>
              <Text style={s.muted}>IGST</Text>
              <Text>{formatMoney(invoice.igst, cur)}</Text>
            </View>
          )}
          <View style={s.grand}>
            <Text>Total</Text>
            <Text>{formatMoney(invoice.total, cur)}</Text>
          </View>
        </View>

        {invoice.lutDeclaration ? (
          <Text style={[s.muted, s.section]}>
            Supply meant for export of services under LUT without payment of IGST.
          </Text>
        ) : null}

        <View style={s.section}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Payment details</Text>
          {business?.bankName ? <Text style={s.muted}>Bank: {business.bankName}</Text> : null}
          {business?.bankAccount ? <Text style={s.muted}>A/C: {business.bankAccount}</Text> : null}
          {business?.ifsc ? <Text style={s.muted}>IFSC: {business.ifsc}</Text> : null}
          {invoice.notes ? <Text style={[s.muted, { marginTop: 6 }]}>{invoice.notes}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}
