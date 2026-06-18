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

## Notes
- `next@15.1.6` has a known advisory (CVE-2025-66478) — upgrade to a patched 15.x before production.
- Fill real bank/LUT/SAC and logo in `BusinessProfile` (seed or a future settings screen) before sending real invoices.
