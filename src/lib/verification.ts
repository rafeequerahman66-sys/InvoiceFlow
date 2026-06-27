import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getMailer } from "@/lib/integrations/email";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Best-effort origin for building absolute links inside server actions/handlers. */
async function origin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Create a fresh token (replacing any prior ones) and email the verify link. */
export async function sendVerificationEmail(userId: string, email: string, name?: string | null): Promise<void> {
  await prisma.verificationToken.deleteMany({ where: { userId } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { token, userId, expires: new Date(Date.now() + TTL_MS) },
  });
  const url = `${await origin()}/verify?token=${token}`;
  await getMailer().send({ to: email, template: "VERIFY_EMAIL", data: { url, name } });
}

/** Validate a token: mark the user verified and clear their tokens. */
export async function consumeVerificationToken(token: string): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row) return false;
  if (row.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { id: row.id } }).catch(() => {});
    return false;
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.deleteMany({ where: { userId: row.userId } }),
  ]);
  return true;
}
