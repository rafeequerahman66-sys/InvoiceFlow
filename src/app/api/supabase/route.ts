import { withSupabase } from "@supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Example server-side Supabase handler (@supabase/server).
 *
 * This app's user auth is NextAuth + Prisma, so we DON'T use Supabase's "user"
 * JWT mode here — `auth: "secret"` is server-to-server (caller must present the
 * secret key). `ctx.supabaseAdmin` bypasses RLS; `ctx.supabase` is RLS-scoped.
 *
 * Reads SUPABASE_URL / SUPABASE_SECRET_KEY (and SUPABASE_JWKS_URL for "user"
 * mode) from the environment. Gate/authorize before exposing real data.
 *
 * NOTE: requires `npm install @supabase/server`. It talks to the Supabase
 * project directly (independent of DATABASE_URL/Prisma).
 */
export const GET = withSupabase({ auth: "secret" }, async (_req, ctx) => {
  const { data, error } = await ctx.supabaseAdmin
    .from("Organization")
    .select("id,name,slug")
    .limit(10);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ organizations: data });
});
