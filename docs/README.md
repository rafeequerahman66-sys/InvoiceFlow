# InvoiceFlow — Documentation

Deliverables for the InvoiceFlow build.

1. [System Architecture](ARCHITECTURE.md)
2. [Database Schema](DATABASE.md)
3. [API Structure](API.md)
4. [Folder Structure](FOLDER_STRUCTURE.md)
5. [UI Wireframes](WIREFRAMES.md)
6. [Implementation Roadmap](ROADMAP.md)
7. [MVP Scope](MVP.md)
8. [Production Architecture](PRODUCTION_ARCHITECTURE.md)
9. [Deployment Guide](DEPLOYMENT.md)

Source code (deliverable 10) is the application itself under `src/`.

## What this is
A single-tenant, GST-compliant invoicing + quotation tool for Rin Media, built on Next.js 15 / React 19 / Prisma / PostgreSQL / Auth.js v5, designed to evolve into the multi-tenant SaaS described in the brief. Integrations (payments, email, storage, AI) are wired behind interfaces with mock implementations so the app runs with zero external keys.
