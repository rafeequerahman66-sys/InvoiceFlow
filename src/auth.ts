import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Single-tenant auth: Google sign-in, but only emails on the allowlist may in.
 * Set ALLOWED_EMAILS in .env as a comma-separated list (you + Ismaeel).
 */
const allowed = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      // If no allowlist is configured, fail closed rather than open.
      if (allowed.length === 0) return false;
      return allowed.includes(email);
    },
    async session({ session }) {
      return session;
    },
  },
});
