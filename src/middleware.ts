import { NextResponse, type NextRequest } from "next/server";

// Public paths (no session required).
const PUBLIC = ["/login", "/signup", "/api/auth", "/share", "/api/cron"];

/**
 * Edge-safe gate: redirects to /login when the Auth.js session cookie is absent.
 * This is a convenience guard only — the real tenant/permission boundary is
 * requireOrg() in every page and server action (validated server-side).
 */
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  const hasSession =
    req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
