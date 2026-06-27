"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { hashPassword } from "@/lib/password";

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

  // Unique org slug.
  const base = slugify(data.company);
  let slug = base;
  for (let i = 1; await prisma.organization.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  const passwordHash = await hashPassword(data.password);
  await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({ data: { name: data.company, slug, email } });
    const user = await tx.user.create({ data: { email, name: data.name, passwordHash } });
    await tx.membership.create({ data: { userId: user.id, orgId: created.id, role: "OWNER" } });
  });

  // Account created — send to login (auto sign-in inside a server action is
  // unreliable in Auth.js v5). Throws NEXT_REDIRECT (propagates as navigation).
  redirect("/login?registered=1");
}

export async function login(_email: string, _password: string) {
  const email = _email.trim().toLowerCase();
  try {
    await signIn("credentials", { email, password: _password, redirectTo: "/dashboard" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Invalid email or password." };
    throw e; // redirect
  }
}
