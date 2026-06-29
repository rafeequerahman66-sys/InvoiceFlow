"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { fieldClasses, Label } from "@/components/ui/input";
import {
  duplicateInvoice,
  deleteInvoice,
  cancelInvoice,
  markInvoicePaid,
  recordPayment,
  sendInvoice,
  createPaymentLink,
} from "@/actions/invoices";

const METHODS = ["BANK_TRANSFER", "UPI", "RAZORPAY", "CRYPTO", "OTHER"] as const;

export function InvoiceActions({
  invoiceId,
  status,
  balance,
}: {
  invoiceId: string;
  status: string;
  balance: number;
}) {
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState(balance);
  const [method, setMethod] = useState<(typeof METHODS)[number]>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const router = useRouter();

  const isDraft = status === "DRAFT";
  const isCancelled = status === "CANCELLED";
  const isPaid = status === "PAID";

  const run = (fn: () => Promise<unknown>) => () => {
    setBusy(true);
    fn()
      .catch((e) => alert((e as Error).message))
      .finally(() => setBusy(false));
  };

  async function submitPayment() {
    setBusy(true);
    try {
      await recordPayment({ invoiceId, amount, method, reference: reference || undefined, paidAt: new Date(paidAt) });
      setPayOpen(false);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyPayLink() {
    setBusy(true);
    try {
      const url = await createPaymentLink(invoiceId);
      const full = typeof window !== "undefined" ? new URL(url, window.location.origin).toString() : url;
      await navigator.clipboard.writeText(full);
      alert("Payment link copied:\n" + full);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyPublicLink() {
    const url = `${window.location.origin}/share/invoice/${invoiceId}`;
    await navigator.clipboard.writeText(url);
    alert("Public link copied:\n" + url);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {!isCancelled && !isPaid && (
          <Button size="sm" disabled={busy} onClick={() => setPayOpen(true)}>
            Record payment
          </Button>
        )}
        {!isCancelled && !isPaid && (
          <Button variant="outline" size="sm" disabled={busy} onClick={run(() => markInvoicePaid(invoiceId).then(() => router.refresh()))}>
            Mark paid
          </Button>
        )}
        {/* Plain <a> (not Next Link): the route returns a binary PDF the client
            router can't navigate to. Opens the generated PDF inline in the same
            tab; the browser's viewer handles download/print. */}
        <a href={`/api/pdf?invoiceId=${invoiceId}`} className={buttonClasses("outline", "sm")}>
          View PDF
        </a>
        <Button variant="outline" size="sm" disabled={busy} onClick={run(() => sendInvoice(invoiceId).then(() => router.refresh()))}>
          Send
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={copyPublicLink}>
          Public link
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={copyPayLink}>
          Payment link
        </Button>
        {isDraft && (
          <ButtonLink href={`/invoices/${invoiceId}/edit`} variant="outline" size="sm">
            Edit
          </ButtonLink>
        )}
        <Button variant="outline" size="sm" disabled={busy} onClick={run(() => duplicateInvoice(invoiceId))}>
          Duplicate
        </Button>
        {!isCancelled && !isDraft && (
          <Button
            variant="danger"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (confirm("Cancel this invoice? It stays on record (number preserved) but is voided.")) run(() => cancelInvoice(invoiceId).then(() => router.refresh()))();
            }}
          >
            Cancel
          </Button>
        )}
        {isDraft && (
          <Button
            variant="danger"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (confirm("Delete this draft? This cannot be undone.")) run(() => deleteInvoice(invoiceId))();
            }}
          >
            Delete
          </Button>
        )}
      </div>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} title="Record payment">
        <div className="space-y-3">
          <div>
            <Label>Amount</Label>
            <input type="number" min={0} className={fieldClasses("w-full")} value={amount} onChange={(e) => setAmount(+e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Method</Label>
              <select className={fieldClasses("w-full")} value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Date</Label>
              <input type="date" className={fieldClasses("w-full")} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Reference (UTR / txn id)</Label>
            <input className={fieldClasses("w-full")} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <Button className="w-full" disabled={busy || amount <= 0} onClick={submitPayment}>
            {busy ? "Saving…" : "Save payment"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
