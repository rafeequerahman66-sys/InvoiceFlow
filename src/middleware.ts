import { NextResponse } from "next/server";

// Personal / single-user mode: no authentication gate. Every route is
// accessible locally. (To re-enable the Google sign-in gate, restore the
// auth() wrapper from git history.)
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
