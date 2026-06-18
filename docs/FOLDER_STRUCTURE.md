# Folder Structure

```
invoiceflow/
├── prisma/
│   ├── schema.prisma          # data model
│   └── seed.ts                # business profile, users, sample clients, catalog
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # root + ThemeProvider + no-flash script
│   │   ├── globals.css        # Tailwind + print CSS
│   │   ├── (auth)/login/      # Google sign-in
│   │   ├── dashboard/         # KPIs + revenue chart + recents
│   │   ├── invoices/
│   │   │   ├── page.tsx       # list
│   │   │   ├── new/           # create form (also reused for edit)
│   │   │   └── [id]/          # detail · edit · print
│   │   ├── quotations/        # list · new · [id] (detail · edit · print)
│   │   ├── clients/           # list · new · [id] (detail · edit)
│   │   ├── catalog/           # list · new · [id]/edit
│   │   ├── share/invoice/[id] # public read-only view
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       └── pdf/           # react-pdf endpoint
│   ├── actions/               # server actions (write API): invoices, quotes, clients, catalog
│   ├── components/
│   │   ├── ui/                # shadcn-style primitives: button, card, badge, input, table, dialog
│   │   ├── sidebar.tsx        # nav + theme toggle + sign out
│   │   ├── theme-provider.tsx # hand-rolled dark mode
│   │   ├── line-items-editor.tsx, totals-panel.tsx  # shared form parts
│   │   ├── document-sheet.tsx, document-line-table.tsx  # printable docs
│   │   └── revenue-chart.tsx  # hand-rolled SVG chart
│   ├── lib/
│   │   ├── tax.ts             # GST engine (pure, tested)
│   │   ├── numbering.ts       # gapless FY numbering
│   │   ├── money.ts, fx.ts, document.ts, cn.ts, session.ts, db.ts
│   │   ├── pdf/invoice-document.tsx   # react-pdf layout
│   │   └── integrations/      # email · payments · storage · ai (interfaces + mocks)
│   ├── auth.ts                # Auth.js v5 config (allowlist)
│   └── middleware.ts          # route gate (public: /login, /api/auth, /share)
├── tests/tax.test.ts          # 15 GST unit tests (Vitest)
└── docs/                      # these deliverables
```

## Conventions

- **Server Components by default**; add `"use client"` only for interactivity.
- DB-backed pages set `export const dynamic = "force-dynamic"` (no build-time prerender).
- One Server Action file per domain; pure logic stays in `src/lib`.
- UI uses `src/components/ui` primitives with `dark:` variants throughout.
