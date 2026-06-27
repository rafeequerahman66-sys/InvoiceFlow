import "server-only";
import { createAdminClient, createContextClient } from "@supabase/server/core";

/**
 * Server-side Supabase clients (@supabase/server). SEPARATE from the app's
 * primary data path (Prisma + DATABASE_URL) and from NextAuth — use these only
 * when you specifically need to talk to the Supabase project's REST/Storage/etc.
 *
 * server-only: never import this from a Client Component (it can read the
 * SUPABASE_SECRET_KEY). Reads SUPABASE_URL / SUPABASE_SECRET_KEY /
 * SUPABASE_PUBLISHABLE_KEY from the environment.
 */

/** Admin client — bypasses Row-Level Security. Authorize the caller yourself first. */
export function supabaseAdmin() {
  return createAdminClient();
}

/** Anonymous / RLS-scoped client (publishable key, no user token). */
export function supabaseAnon() {
  return createContextClient();
}
