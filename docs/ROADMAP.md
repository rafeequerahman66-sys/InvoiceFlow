# Implementation Roadmap

From the single-tenant MVP to the full multi-tenant SaaS in the brief.

## Phase 0 — MVP (done)
Single-tenant invoicing + quotations, PDF, dashboard, dark mode, integration stubs. See `MVP.md`.

## Phase 1 — Harden the core
- Allocate the gapless number on **finalize/send** (not at draft creation) so deleted drafts never leave gaps.
- `OVERDUE` as a scheduled status transition (cron) rather than derived-only.
- Per-line `unit`, HSN/SAC validation, rounding line on the invoice.
- Profile/settings screen for `BusinessProfile` (logo upload via storage adapter, brand color, prefixes, bank/LUT).
- CSV/Excel export of invoices/payments (Reporting v1).

## Phase 2 — Multi-tenancy
- Add `Organization` + `Membership(role)`; stamp `orgId` on Client/Invoice/Quotation/Catalog/NumberSequence/Payment with composite indexes.
- Scope every query by `orgId`; move `BusinessProfile` fields onto `Organization`.
- Org-switcher UI; invite flow; RBAC (OWNER/ADMIN/MEMBER/VIEWER).
- Numbering becomes `(orgId, docType, fyLabel)`.

## Phase 3 — Billing & plans
- `Plan`/`Subscription` models; Free (10 invoices/mo) / Pro / Agency.
- Metering + entitlement checks (feature flags) at action boundary.
- Stripe billing for subscription itself (separate from customer payment collection).

## Phase 4 — Real integrations
- **Payments**: implement `PaymentGateway` for Stripe + Razorpay (+ PayPal); webhooks update `Payment`/status; receipts.
- **Email**: implement `Mailer` with Resend/SendGrid; templates (invoice, quote, reminder, due, thank-you); scheduled reminders.
- **Storage**: implement `FileStorage` for S3/Cloudinary (logos, PDF archive).
- **AI**: implement `AIProvider` with Claude — invoice/quote description, email drafts, expense categorization.

## Phase 5 — Automation & analytics
- Recurring invoices (retainers); payment follow-up sequences.
- Reporting & analytics: revenue/tax/client reports, monthly & yearly trends.
- Admin panel: user/subscription management, revenue, feature flags, support tickets.

## Phase 6 — Scale & compliance
- Redis caching + rate limiting; background job queue.
- Custom tax rules engine (VAT and non-IN regimes) generalizing the GST engine.
- Data encryption at rest for PII, audit-log retention, SOC2-style controls.

Each phase is shippable on its own; Phases 2–3 are the gate between "internal tool" and "SaaS".
