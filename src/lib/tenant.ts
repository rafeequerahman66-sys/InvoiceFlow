import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
const RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };
export const ACTIVE_ORG_COOKIE = "activeOrg";

export type OrgContext = {
  userId: string;
  userName: string | null;
  userEmail: string;
  orgId: string;
  orgName: string;
  role: Role;
};

export function hasRole(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

// Minimal select — avoids pulling passwordHash, tokens, full org rows, etc.
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  memberships: {
    select: {
      id: true,
      orgId: true,
      role: true,
      createdAt: true,
      org: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

/**
 * Resolve the signed-in user + their active organization. Redirects to /login
 * if unauthenticated, and to /dashboard if the role is below `minRole`.
 * Memoized with React cache() so multiple calls in one render hit the DB once.
 */
export const requireOrg = cache(async (minRole: Role = "VIEWER"): Promise<OrgContext> => {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email }, select: USER_SELECT });
  if (!user || user.memberships.length === 0) redirect("/login");

  const store = await cookies();
  const wanted = store.get(ACTIVE_ORG_COOKIE)?.value;
  const membership = user.memberships.find((m) => m.orgId === wanted) ?? user.memberships[0];
  const role = membership.role as Role;
  if (!hasRole(role, minRole)) redirect("/dashboard");

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    orgId: membership.orgId,
    orgName: membership.org.name,
    role,
  };
});

/** All orgs the signed-in user belongs to (for the org switcher). Empty if none. */
export async function getUserOrgs(): Promise<{ id: string; name: string; role: Role }[]> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return [];
  const user = await prisma.user.findUnique({ where: { email }, select: USER_SELECT });
  return (user?.memberships ?? []).map((m) => ({ id: m.orgId, name: m.org.name, role: m.role as Role }));
}
