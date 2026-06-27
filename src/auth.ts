import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

/**
 * Multi-tenant auth. Email/password (Credentials) is the sign-up baseline;
 * Google is added only if AUTH_GOOGLE_ID is configured. JWT sessions (required
 * for Credentials). Route protection lives in middleware (cookie presence) +
 * requireOrg() server-side (the real boundary).
 */
const providers = [
  Credentials({
    credentials: { email: {}, password: {} },
    authorize: async (creds) => {
      const email = String(creds?.email ?? "").trim().toLowerCase();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) return null;
      // Block sign-in until the email is verified (defense-in-depth; the login
      // action also pre-checks to show a friendlier "verify your email" message).
      if (!user.emailVerified) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID) providers.push(Google as never);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.uid) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
});
