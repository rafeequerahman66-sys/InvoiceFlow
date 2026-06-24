// Picks the right Prisma schema per environment:
//   • Vercel (process.env.VERCEL) → Postgres/Supabase schema
//   • Local dev                   → SQLite schema (fast, offline)
// Cross-platform (runs via node, so it works on Windows + Vercel's Linux).
import { execSync } from "node:child_process";

const schema = process.env.VERCEL ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";
console.log(`[prisma-generate] using ${schema} (VERCEL=${process.env.VERCEL ?? "0"})`);
execSync(`npx prisma generate --schema=${schema}`, { stdio: "inherit" });
