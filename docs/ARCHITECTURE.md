# System Architecture

InvoiceFlow is a **single-tenant** GST-compliant billing app for Rin Media (Crew Catalyst Innovations Pvt Ltd), built to be evolvable into a multi-tenant SaaS. This document describes the system as built, and `PRODUCTION_ARCHITECTURE.md` describes the scale-out target.

## High-level

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React 19)                      │
│  Server Components (RSC)  +  Client Components ("use client")  │
└───────────────┬───────────────────────────────┬──────────────┘
                │ HTML/RSC payload               │ Server Action calls
                ▼                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                  Next.js 15 App Router (Node)                  │
│  • Pages (RSC)          • Server Actions (src/actions/*)       │
│  • Route handlers       • Middleware (auth gate)               │
│  • Auth.js v5 (Google)  • /api/pdf (react-pdf, Node runtime)   │
└───────────────┬───────────────────────────────┬──────────────┘
                │ Prisma Client                  │ adapters (stubbed)
                ▼                                 ▼
┌────────────────────────┐        ┌──────────────────────────────┐
│  PostgreSQL (Supabase)  │        │  Integrations (interfaces):   │
│  via Prisma ORM         │        │  email · payments · storage · │
│                         │        │  ai  → mock impls by default  │
└────────────────────────┘        └──────────────────────────────┘
```

## Layers

- **Presentation** — App Router pages under `src/app`. Server Components fetch via Prisma directly; interactivity (forms, dialogs, action bars) lives in `"use client"` components. Shared UI primitives in `src/components/ui`.
- **Domain logic** — Pure, dependency-free modules in `src/lib`:
  - `tax.ts` — the GST engine (supply-type resolution, CGST/SGST/IGST split, invoice totals). Unit-tested, never imports Prisma/React.
  - `numbering.ts` — gapless per-FY, per-doc-type sequence allocation (must run in a transaction).
  - `money.ts`, `fx.ts`, `document.ts` — formatting, exchange rates, record→sheet mapping.
- **Application services** — Server Actions in `src/actions` orchestrate validation (Zod) → domain logic → Prisma transactions → `revalidatePath`. This is the write API.
- **Integrations** — `src/lib/integrations/*` expose interfaces (`Mailer`, `PaymentGateway`, `FileStorage`, `AIProvider`) with mock implementations selected by env vars. Real providers (Resend, Stripe/Razorpay, S3, Claude) drop in without touching call sites.
- **Data** — PostgreSQL via Prisma. Decimal columns for all money; enums for status/supply-type/method.

## Key design decisions

1. **Pure tax engine** — legal correctness is isolated and tested; UI preview and server compute use the same function, so they can never disagree.
2. **Gapless numbering in a transaction** — concurrent saves can't collide or skip numbers (GST audit requirement).
3. **Draft-only mutation** — issued invoices are never edited or hard-deleted; they're cancelled (soft) to preserve the number sequence.
4. **Server Actions over REST** — writes are colocated, type-safe, and validated at the boundary with Zod. A REST/tRPC layer is only needed when external clients appear (see roadmap).
5. **Integrations behind interfaces** — keeps the app runnable with zero external keys while leaving a clean seam for production providers.

## Request lifecycle (create invoice)

1. `InvoiceForm` (client) previews totals locally via `computeInvoiceTotals`.
2. On submit it calls the `createInvoice` Server Action.
3. The action validates with `createInvoiceSchema`, recomputes totals server-side, fetches the FX rate, then in one Prisma transaction allocates the next number and writes the invoice + items.
4. An `ActivityLog` row is written; affected paths are revalidated; the user is redirected to the detail page.
