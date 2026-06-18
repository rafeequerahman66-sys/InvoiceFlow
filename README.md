# InvoiceFlow — Rin Media internal billing

A single-tenant Next.js 15 app for issuing GST-compliant invoices and quotations
for Crew Catalyst Innovations Pvt Ltd (Rin Media). Scoped for you + Ismaeel, not
as a SaaS product.

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind
- Prisma + PostgreSQL (Supabase)
- Auth.js v5 — Google sign-in, restricted to an email allowlist
- PDF via your existing WeasyPrint service (called from `/api/pdf`)

## The part that matters

`src/lib/tax.ts` is the GST engine — pure, dependency-free, and tested in
`tests/tax.test.ts`. It resolves supply type (Kerala → CGST+SGST, other state →
IGST, foreign → 0% export under LUT) and computes line + invoice totals. The same
functions run on the server (in the `createInvoice` action) and in the live
builder UI, so the preview can never disagree with what gets saved.

Run the tests:

```bash
npm run test        # 15 tax-engine tests
```

## Setup

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env
#    - paste your Supabase DATABASE_URL
#    - npx auth secret            (fills AUTH_SECRET)
#    - add Google OAuth client id/secret (console.cloud.google.com)
#      authorized redirect URI: http://localhost:3000/api/auth/callback/google
#    - set ALLOWED_EMAILS to you + Ismaeel

# 3. database
npx prisma migrate dev --name init
npm run db:seed       # business profile, users, sample clients + catalog

# 4. run
npm run dev           # http://localhost:3000  -> redirects to /login
```

## What's built (Phase 1)

- GST tax engine + tests
- FY-based gapless invoice numbering (`INV/2026-27/0001`), allocated inside the
  create transaction so concurrent saves can't collide
- Google auth with allowlist, route gating via middleware
- Client + catalog data model and seed
- `createInvoice` / `markInvoicePaid` / `cancelInvoice` server actions
- Dashboard, invoice list, and a live invoice builder
- `/api/pdf` bridge to your WeasyPrint service

## What's stubbed / next (Phase 2–3)

- Quotations + convert-to-invoice (schema is ready; UI/actions to add)
- Full client & catalog CRUD screens (actions exist; pages are minimal)
- FX source: `src/lib/fx.ts` uses a free API with hardcoded fallbacks — swap in
  RBI/your bank rate before relying on it for books
- Razorpay payment links (Indian clients), email send via Resend
- Recurring invoices for retainer clients

## Notes before going live

- Fill the real bank/LUT/SAC values in `prisma/seed.ts` (or via Prisma Studio) —
  they're placeholders.
- Issued invoices should be **cancelled, never deleted**, to keep the number
  sequence gapless (GST requirement). `cancelInvoice` does this.
- `lib/tax.ts` is the one file to guard with tests on every change.
