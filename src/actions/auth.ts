"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { hashPassword } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/verification";

const signUpSchema = z.object({
  name: z.string().min(1, "Your name is required"),
  company: z.string().min(1, "Company name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org"
  );
}

export async function signUp(input: SignUpInput) {
  const data = signUpSchema.parse(input);
  const email = data.email.toLowerCase();

  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "An account with this email already exists." };
  }

  const base = slugify(data.company);
  let slug = base;
  for (let i = 1; await prisma.organization.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({ data: { name: data.company, slug, email } });
    const u = await tx.user.create({ data: { email, name: data.name, passwordHash } }); // emailVerified null
    await tx.membership.create({ data: { userId: u.id, orgId: created.id, role: "OWNER" } });
    return u;
  });

  // Send the verification link (don't fail signup if delivery errors — they can resend).
  try {
    await sendVerificationEmail(user.id, user.email, user.name);
  } catch (e) {
    console.error("verification email failed:", (e as Error).message);
  }

  redirect("/login?verify=sent");
}

export async function login(_email: string, _password: string) {
  const email = _email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    return { error: "Please verify your email first — check your inbox.", needsVerify: true, email };
  }
  try {
    await signIn("credentials", { email, password: _password, redirectTo: "/dashboard" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Invalid email or password." };
    throw e; // redirect
  }
}

/** Resend a verification link. Doesn't reveal whether the email exists. */
export async function resendVerification(email: string) {
  const e = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: e } });
  if (user && !user.emailVerified) {
    try {
      await sendVerificationEmail(user.id, user.email, user.name);
    } catch (err) {
      return { error: "Couldn't send the email. Try again shortly." };
    }
  }
  return { ok: true };
}
