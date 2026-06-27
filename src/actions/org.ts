"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signOut } from "@/auth";
import { ACTIVE_ORG_COOKIE, getUserOrgs, requireOrg } from "@/lib/tenant";

const orgProfileSchema = z.object({
  name: z.string().min(1, "Name required"),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  stateCode: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  ifsc: z.string().optional(),
  lutNumber: z.string().optional(),
  invoicePrefix: z.string().optional(),
  quotePrefix: z.string().optional(),
});

export type OrgProfileInput = z.infer<typeof orgProfileSchema>;

export async function updateOrgProfile(input: OrgProfileInput) {
  const data = orgProfileSchema.parse(input);
  const { orgId } = await requireOrg("ADMIN");
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: data.name,
      legalName: data.legalName || null,
      gstin: data.gstin || null,
      stateCode: data.stateCode || "32",
      address: data.address || null,
      email: data.email || null,
      phone: data.phone || null,
      bankName: data.bankName || null,
      bankAccount: data.bankAccount || null,
      ifsc: data.ifsc || null,
      lutNumber: data.lutNumber || null,
      invoicePrefix: data.invoicePrefix || "INV",
      quotePrefix: data.quotePrefix || "QT",
    },
  });
  revalidatePath("/settings");
}

/** Add an existing user (by email) to the org. Email invitations are deferred. */
export async function addMember(email: string, role: "ADMIN" | "MEMBER" | "VIEWER") {
  const { orgId } = await requireOrg("ADMIN");
  const target = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!target) throw new Error("No account with that email yet. Ask them to sign up first.");
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: target.id, orgId } },
    update: { role },
    create: { userId: target.id, orgId, role },
  });
  revalidatePath("/settings");
}

export async function removeMember(membershipId: string) {
  const { orgId } = await requireOrg("ADMIN");
  const m = await prisma.membership.findFirst({ where: { id: membershipId, orgId } });
  if (!m) throw new Error("Member not found");
  if (m.role === "OWNER") throw new Error("Cannot remove the owner.");
  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath("/settings");
}

/** Switch the active organization (validated against the user's memberships). */
export async function setActiveOrg(orgId: string) {
  const orgs = await getUserOrgs();
  if (!orgs.some((o) => o.id === orgId)) throw new Error("You are not a member of that organization.");
  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/dashboard");
}

export async function signOutAction() {
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  await signOut({ redirectTo: "/login" });
}
