# Deployment Guide

## Prerequisites
- Node 18+ (20 LTS recommended), a PostgreSQL database (Supabase or any Postgres), a Google OAuth app.

## Environment variables (`.env`)
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
AUTH_SECRET="<output of: npx auth secret>"
AUTH_GOOGLE_ID="<google oauth client id>"
AUTH_GOOGLE_SECRET="<google oauth client secret>"
ALLOWED_EMAILS="you@example.com"            # comma-separated allowlist

# Optional — integrations default to safe mocks when unset:
# EMAIL_PROVIDER=resend       RESEND_API_KEY=...
# PAYMENT_PROVIDER=razorpay   RAZORPAY_KEY_ID=...  RAZORPAY_KEY_SECRET=...
# STORAGE_DRIVER=s3           AWS_... / CLOUDINARY_URL
# AI_PROVIDER=claude          ANTHROPIC_API_KEY=...
```

## Local setup
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init    # creates tables
npm run db:seed                       # business profile, users, sample data
npm run dev                           # http://localhost:3000
```

## Google OAuth
Authorized redirect URI: `https://<your-domain>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for dev). Only emails in `ALLOWED_EMAILS` can sign in (fails closed if empty).

## Production build
```bash
npm run build
npm run start        # or deploy to Vercel
```

## Deploy to Vercel + Supabase — checklist (multi-tenant)

The app is multi-tenant: local dev runs on **SQLite** (`prisma/schema.prisma`), production on **Supabase Postgres** (`prisma/schema.postgres.prisma`). `scripts/prisma-generate.mjs` auto-selects the schema by `VERCEL`. Steps, in order:

1. **Project env vars** — set on the **project** (Project → Settings → Environment Variables), *not* the Team page, scoped to all environments:
   - `DATABASE_URL` — Supabase **session pooler** URI (`...pooler.supabase.com:5432/...`). URL-encode specials in the password (`@` → `%40`). For heavier serverless load, use the **transaction pooler** (`:6543`, `?pgbouncer=true`).
   - `AUTH_SECRET` — `npx auth secret` (required by Auth.js; build succeeds without it but login/signup throw at runtime).
   - Optional: `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` / `SUPABASE_JWKS_URL` (only for `/api/supabase`).
2. **Migrate Supabase to the schema** (one-time, from a machine that can reach it):
   `DATABASE_URL="<supabase>" npx prisma db push --schema=prisma/schema.postgres.prisma --skip-generate`
   For the *initial* single→multi-tenant migration only, the populated tables can't gain a required `orgId` incrementally — use `--force-reset` (drops all data; Prisma gates this for AI agents via `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`). After that it's an additive no-op.
3. **Build command** — `next build` works (the `postinstall` generates the right client). `npm run vercel-build` is equivalent. **Do not** run `db push` in the build (build-time DB mutation fails CI — migrate out-of-band per step 2).
4. **Redeploy**, wait for **Ready**.
5. **First login** — production starts **empty** (no seed). Go to `/signup`, create the first account + workspace, then log in. (The local seed user `owner@rinmedia.test` exists only in local SQLite.)
6. `@react-pdf/renderer` is in `serverExternalPackages`; `/api/pdf` runs on Node, with `/invoices/[id]/print` as fallback.

## Post-deploy checks
- `/signup` creates an org + owner; sign in at `/login`.
- Create a client → invoice → record payment → open `/api/pdf` and the print view.
- Verify the public link `/share/invoice/[id]` loads without auth for a non-draft invoice.
- Sign up a second org and confirm it sees none of the first org's data (tenant isolation).

## @supabase/server SDK (server-side)
Used by `src/lib/supabase.ts` (`supabaseAdmin()` / `supabaseAnon()`) and the example route `/api/supabase`. This is **separate** from the Prisma data path — it talks to the Supabase project's REST API directly, and is server-only (the secret key must never reach the client).

- The dependency is in `package.json`, so Vercel's `npm install` (and `vercel-build`) installs it automatically — no build step change needed, and the build does **not** require the env vars (handlers are `force-dynamic`, nothing runs at build).
- **Runtime** needs these env vars set in Vercel (from Supabase → Connect). Without them, only `/api/supabase` (and any code calling the helpers) errors — the rest of the app is unaffected:
  - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`
  - Keep `SUPABASE_SECRET_KEY` in Vercel env only — never commit it.
- The example route uses `auth: "secret"` (server-to-server; caller must send the secret key in the `apikey` header). It does **not** use Supabase Auth "user" JWTs, since app users authenticate via NextAuth.
- On Supabase Edge Functions the `SUPABASE_*` vars are injected automatically; for non-"user" auth modes set `verify_jwt = false` in `supabase/config.toml`. (Not applicable to this Next.js deploy.)

## Notes
- `next@15.1.6` has a known advisory (CVE-2025-66478) — upgrade to a patched 15.x before production.
- Fill real org profile (GSTIN, bank, LUT) per workspace in **Settings** before sending real invoices.
