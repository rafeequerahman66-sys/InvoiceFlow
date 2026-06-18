"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  sendQuote,
  duplicateQuote,
  deleteQuote,
  updateQuoteStatus,
  convertQuoteToInvoice,
} from "@/actions/quotes";

export function QuoteActions({
  quoteId,
  status,
  convertedInvoiceId,
}: {
  quoteId: string;
  status: string;
  convertedInvoiceId: string | null;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const disabled = pending || busy;
  const isDraft = status === "DRAFT";
  const isConverted = status === "CONVERTED";

  const run = (fn: () => Promise<unknown>) => () => {
    setBusy(true);
    fn()
      .catch((e) => alert((e as Error).message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isConverted && convertedInvoiceId ? (
        <ButtonLink href={`/invoices/${convertedInvoiceId}`} variant="primary" size="sm">
          View invoice →
        </ButtonLink>
      ) : (
        <Button size="sm" disabled={disabled} onClick={run(() => convertQuoteToInvoice(quoteId))}>
          Convert to invoice
        </Button>
      )}

      <ButtonLink href={`/quotations/${quoteId}/print`} variant="outline" size="sm" target="_blank">
        Download PDF
      </ButtonLink>

      <Button variant="outline" size="sm" disabled={disabled} onClick={run(() => sendQuote(quoteId))}>
        Send
      </Button>

      {isDraft && (
        <ButtonLink href={`/quotations/${quoteId}/edit`} variant="outline" size="sm">
          Edit
        </ButtonLink>
      )}

      <Button variant="outline" size="sm" disabled={disabled} onClick={run(() => duplicateQuote(quoteId))}>
        Duplicate
      </Button>

      {!isConverted && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => start(() => updateQuoteStatus(quoteId, "ACCEPTED").then(() => router.refresh()))}
          >
            Mark accepted
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => start(() => updateQuoteStatus(quoteId, "REJECTED").then(() => router.refresh()))}
          >
            Mark rejected
          </Button>
        </>
      )}

      {!isConverted && (
        <Button
          variant="danger"
          size="sm"
          disabled={disabled}
          onClick={() => {
            if (confirm("Delete this quotation? This cannot be undone.")) run(() => deleteQuote(quoteId))();
          }}
        >
          Delete
        </Button>
      )}
    </div>
  );
}
