import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof makeClient> };

// Connection-level errors worth retrying — the Supabase pooler over NAT64 on
// this network drops occasionally; a quick retry rides out the blip instead of
// surfacing a raw "server-side exception" page.
const RETRYABLE = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastErr: unknown;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            const code =
              err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined;
            const initFail = err instanceof Prisma.PrismaClientInitializationError;
            if ((code && RETRYABLE.has(code)) || initFail) {
              lastErr = err;
              if (attempt < MAX_ATTEMPTS) {
                await sleep(250 * attempt); // 250ms, 500ms, 750ms backoff
                continue;
              }
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
