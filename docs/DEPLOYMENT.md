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

## Deploy to Vercel (recommended)
1. Import the repo; set all env vars in Project Settings.
2. Build command `next build`, output auto-detected.
3. Use a pooled connection string (Supabase "Connection pooling" / PgBouncer) for `DATABASE_URL` in serverless.
4. Run migrations against the prod DB from CI or locally: `npx prisma migrate deploy`.
5. `@react-pdf/renderer` is already declared in `serverExternalPackages`; `/api/pdf` runs on the Node runtime. If a render ever fails, `/invoices/[id]/print` is the equivalent fallback.

## Post-deploy checks
- Sign in with an allowlisted Google account.
- Create a client → invoice → record payment → open `/api/pdf` and the print view.
- Verify the public link `/share/invoice/[id]` loads without auth for a non-draft invoice.

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
