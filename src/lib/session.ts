import { prisma } from "@/lib/db";
import { auth } from "@/auth";

/** Fixed local identity used in personal / no-auth mode. */
const LOCAL_USER = { email: "local@invoiceflow.app", name: "Local User" };

/**
 * Resolve the acting user. In personal mode there is no login, so we fall back
 * to a single local OWNER. If Google sign-in is re-enabled, the signed-in
 * email takes over automatically.
 */
export async function currentUserId(): Promise<string> {
  let email = LOCAL_USER.email;
  let name: string | null = LOCAL_USER.name;
  try {
    const session = await auth();
    if (session?.user?.email) {
      email = session.user.email;
      name = session.user.name ?? null;
    }
  } catch {
    // No auth configured — stay with the local user.
  }
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, role: "OWNER" },
    update: {},
  });
  return user.id;
}
