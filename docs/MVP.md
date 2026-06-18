# MVP Scope (this build)

Single-tenant InvoiceFlow for Rin Media. Everything below is implemented and runnable.

## Delivered

**Invoices** — create / edit (draft) / duplicate / delete (draft) / cancel; line items with per-line tax; discount (percent/flat, pre-tax); live totals preview; detail page; status flow (DRAFT→SENT→PARTIALLY_PAID/PAID, CANCELLED, OVERDUE derived); record payment (recomputes status); mark paid; send (email stub); public share link; online payment link (gateway stub).

**Quotations** — create / edit (draft) / duplicate / delete; accept/reject; send (stub); **convert to invoice**; detail + print.

**Clients** — create / edit / archive / delete (guarded); detail with invoice history.

**Catalog** — create / edit / archive; autofill rate+tax into line items.

**PDF** — print-optimized A4 view (browser Save-as-PDF, always works) + programmatic `/api/pdf` via react-pdf. Includes brand, GSTIN, bank details, LUT declaration, signature line, QR placeholder.

**Dashboard** — 6 KPI cards, 12-month SVG revenue chart, recent quotations, recent invoices, quick actions.

**Platform** — Google auth (allowlist), dark/light mode, responsive shell, GST engine (15 passing tests), gapless FY numbering, multi-currency (INR/USD/EUR/GBP/AED) with FX snapshot, activity log.

**Integration seams (mocked)** — email, payments, storage, AI (item-description + email-draft) behind interfaces.

## Deferred to roadmap

Multi-tenancy & organizations, subscriptions/plans, admin panel, real payment/email/S3/AI wiring, reminders & recurring invoices, CSV/Excel export, custom tax rules, email verification / forgot-password, RBAC beyond OWNER/MEMBER, Redis caching, rate limiting.

## Definition of done (MVP)

- `npm run build` passes; `npm test` green (15/15).
- All nav routes render; create→detail→PDF→pay flow works end-to-end with a configured DB.
- No external keys required to run (stubs cover payments/email/storage/AI).
