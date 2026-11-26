import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/config";

/**
 * Quick gate before rendering: without a session cookie, go to /login.
 * The (app) layout then checks the session with the backend.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except the login page, API calls and static files.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
