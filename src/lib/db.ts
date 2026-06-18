import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof makeClient> };

// Connection-level errors worth retrying — the Supabase pooler is reached over
// NAT64 on this network and drops for a few seconds at a time. We retry across a
// ~12s window so a multi-second blip recovers instead of surfacing an error page.
const RETRYABLE = new Set(["P1001", "P1002", "P1008", "P1011", "P1017", "P2024", "P2028", "P5010"]);
// Backoff schedule between attempts (ms). length+1 = total attempts.
const BACKOFFS = [300, 600, 1000, 1500, 2500, 3500, 4000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) return RETRYABLE.has(err.code);
  // Fallback: match connection-level messages even if the code isn't populated.
  const msg = err instanceof Error ? err.message : "";
  return /can'?t reach database|connection (closed|reset|terminated)|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(msg);
}

function makeClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastErr: unknown;
        for (let attempt = 0; attempt <= BACKOFFS.length; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            lastErr = err;
            if (isRetryable(err) && attempt < BACKOFFS.length) {
              await sleep(BACKOFFS[attempt]);
              continue;
            }
            throw err;
          }
        }
        throw lastErr;
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Transaction client type for the *extended* client (use in $transaction callbacks). */
export type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
