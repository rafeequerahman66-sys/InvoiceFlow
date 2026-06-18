# Database Schema

PostgreSQL via Prisma (`prisma/schema.prisma`). All monetary values are `Decimal` (no floats). The schema is single-tenant today; `Organization`/tenant scoping is the first step toward multi-tenancy (see `ROADMAP.md`).

## Models

| Model | Purpose | Key fields |
|---|---|---|
| `BusinessProfile` | Singleton (`id = "rinmedia"`) — Rin Media's own details | gstin, stateCode, bank, lutNumber, invoicePrefix, quotePrefix |
| `User` | Auth users (allowlisted) | email (unique), role (OWNER/MEMBER) |
| `Client` | Billed parties | country, stateCode, gstin, defaultCurrency, archived |
| `CatalogItem` | Reusable products/services | kind, sacCode, defaultRate, defaultTax, archived |
| `NumberSequence` | Gapless counters | `@@unique([docType, fyLabel])`, lastNumber |
| `Invoice` | Tax invoice | number (unique), supplyType, subtotal, cgst/sgst/igst, total, totalInr, status |
| `InvoiceItem` | Invoice line | qty, rate, taxRate, lineSubtotal, lineTax, lineTotal |
| `Quotation` | Estimate | number (unique), totalTax, total, status, convertedInvoiceId |
| `QuoteItem` | Quote line | qty, rate, taxRate, lineTotal |
| `Payment` | Payment against an invoice | amount, method, reference, paidAt |
| `ActivityLog` | Audit trail | actorId, action, entityType, entityId, meta (Json) |

## Enums

`Role`, `ItemKind`, `DiscountType`, `SupplyType` (INTRA_STATE / INTER_STATE / EXPORT_LUT / EXPORT_WITH_TAX), `InvoiceStatus` (DRAFT / SENT / PARTIALLY_PAID / PAID / OVERDUE / CANCELLED), `QuoteStatus` (DRAFT / SENT / ACCEPTED / REJECTED / EXPIRED / CONVERTED), `PaymentMethod`, `DocType`.

## Relationships

```
BusinessProfile (singleton)

User 1───* Invoice
User 1───* Quotation
User 1───* ActivityLog

Client 1───* Invoice 1───* InvoiceItem
Client 1───* Quotation 1───* QuoteItem
Invoice 1───* Payment
Quotation 0..1───1 Invoice   (convertedInvoiceId)
```

## Invariants

- **Gapless numbers**: `(docType, fyLabel)` is unique; `lastNumber` only ever increments inside a transaction.
- **Money as Decimal**: `@db.Decimal(14,2)` for amounts, `(5,2)` for tax rates, `(12,4)` for FX.
- **No hard delete of issued docs**: only `DRAFT` invoices/quotes may be deleted; issued invoices are `CANCELLED`.
- **`totalInr`** snapshots the INR book value at issue time using `fxRateToInr`, so GST returns are reproducible.

## Planned additions (multi-tenant — not in MVP)

`Organization`, `Membership` (user↔org with role), `Subscription`/`Plan`, `TaxRule` (custom rates/VAT), `RecurringInvoice`, and an `orgId` foreign key on every tenant-scoped table with a composite index.
