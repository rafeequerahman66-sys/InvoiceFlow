import { NextRequest, NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Email verification link target: /verify?token=... → marks verified, redirects to login. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ok = await consumeVerificationToken(token);
  const dest = ok ? "/login?verified=1" : "/login?verify=invalid";
  return NextResponse.redirect(new URL(dest, req.nextUrl));
}
