# Scalable Production Architecture

Target state for serving thousands of businesses. The MVP is intentionally a subset; this is the destination.

```
                    ┌──────────────┐
   Users ───────────│   CDN / WAF  │  (Vercel Edge / CloudFront)
                    └──────┬───────┘
                           ▼
                 ┌───────────────────┐     ┌───────────────┐
                 │ Next.js (App) x N │────▶│  Redis        │ cache, rate-limit,
                 │  RSC + Actions    │     │  (Upstash)    │ sessions, queues
                 └─────┬───────┬─────┘     └───────────────┘
                       │       │
        ┌──────────────┘       └───────────────┐
        ▼                                       ▼
┌────────────────┐                    ┌────────────────────┐
│ PostgreSQL      │  (Supabase/RDS)    │ Background workers  │
│ + read replicas │  PgBouncer pool    │ (queue consumers):  │
│ row-level multi │                    │ email, reminders,   │
│ tenant (orgId)  │                    │ recurring, webhooks │
└────────────────┘                    └─────────┬──────────┘
        ▲                                        ▼
        │                         ┌──────────────────────────────┐
        │                         │ Providers: Stripe · Razorpay ·│
        └─────────────────────────│ Resend · S3/Cloudinary · LLM  │
                                  └──────────────────────────────┘
```

## Multi-tenancy
Row-level isolation via `orgId` on every tenant table (composite indexes `(orgId, …)`). All queries scoped through a tenant-aware Prisma extension/middleware that injects `orgId` and rejects cross-tenant access. Numbering keyed `(orgId, docType, fyLabel)`.

## Scaling the app tier
- Stateless Next.js instances behind the platform's autoscaler; sessions/JWT in cookies, shared state in Redis.
- **PgBouncer** (transaction pooling) in front of Postgres; read replicas for reports/dashboards.
- Heavy/slow work (PDF batch, email, webhooks, recurring, reminders) off the request path into a **queue** (e.g. BullMQ/Upstash QStash) with idempotent workers.

## Caching & rate limiting (Redis)
- Cache dashboard aggregates and FX rates; invalidate on write via tags.
- Token-bucket rate limiting per org/IP at middleware; stricter limits on `/api/*` and auth.

## Security
- RBAC (OWNER/ADMIN/MEMBER/VIEWER) enforced in the service layer; entitlement/feature-flag checks for plan limits.
- JWT/session via Auth.js; secrets in a managed vault; PII encrypted at rest; full `ActivityLog` audit trail.
- Webhook signature verification; CSRF-safe Server Actions; input validation with Zod everywhere.

## Observability
Structured logs, request tracing, error tracking (Sentry), uptime + DB/queue metrics, alerting on payment-webhook and email failures.

## Data integrity
Money as `Decimal`; financial mutations in transactions; gapless numbering preserved per tenant; soft-cancel (never delete) issued documents; nightly backups + PITR.
