# API Structure

InvoiceFlow's write API is **Server Actions** (type-safe, colocated, Zod-validated). HTTP route handlers are used only where a real endpoint is required (auth, PDF, public share).

## Server Actions

### `src/actions/invoices.ts`
| Action | Signature | Notes |
|---|---|---|
| `createInvoice` | `(CreateInvoiceInput)` | Allocates number, computes totals, writes invoice+items in a tx. Redirects to detail. |
| `updateInvoice` | `(id, CreateInvoiceInput)` | DRAFT only; replaces items + recomputes. |
| `duplicateInvoice` | `(id)` | Copies to a new DRAFT with a fresh number. |
| `deleteInvoice` | `(id)` | DRAFT only (issued → cancel). |
| `updateInvoiceStatus` | `(id, InvoiceStatus)` | |
| `recordPayment` | `(PaymentInput)` | Inserts payment, recomputes PAID/PARTIALLY_PAID. |
| `markInvoicePaid` | `(id)` | Records the outstanding balance in one click. |
| `sendInvoice` | `(id)` | Calls the Mailer stub; DRAFT→SENT. |
| `createPaymentLink` | `(id) → url` | Calls the PaymentGateway stub. |
| `cancelInvoice` | `(id)` | Soft-cancel (preserves number). |

### `src/actions/quotes.ts`
`createQuote`, `updateQuote` (DRAFT), `updateQuoteStatus`, `deleteQuote`, `duplicateQuote`, `sendQuote`, **`convertQuoteToInvoice`** (tx: builds a draft invoice from quote items, marks quote CONVERTED).

### `src/actions/clients.ts`
`createClient`, `updateClient`, `archiveClient`, `deleteClient` (only when no documents exist).

### `src/actions/catalog.ts`
`createCatalogItem`, `updateCatalogItem`, `archiveCatalogItem`.

## HTTP Route Handlers

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | — | Auth.js (Google) handlers |
| `/api/pdf?invoiceId=` | GET | session | Server-rendered PDF via `@react-pdf/renderer`; 500 → fallback to `/invoices/[id]/print` |
| `/share/invoice/[id]` | GET (page) | **public** | Read-only invoice view (non-DRAFT only) |
| `/invoices/[id]/print`, `/quotations/[id]/print` | GET (page) | session | Print-optimized A4 view → browser Save-as-PDF |

## Validation

All inputs validated at the action boundary with Zod schemas in `src/lib/validators.ts`: `createInvoiceSchema`, `createQuoteSchema`, `clientSchema`, `catalogItemSchema`, `paymentSchema`, `lineItemSchema`.

## Future REST/tRPC

When external/mobile clients appear, expose a versioned `/api/v1/*` REST surface (or tRPC) backed by the same `src/actions` service functions, with API-key/JWT auth and per-tenant rate limiting.
