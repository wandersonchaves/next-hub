import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get('nexthub_token')?.value;
  const { pathname } = request.nextUrl;

  const isPublicRoute = ["/", "/webhooks"].some(route => pathname === route || pathname.startsWith(route));
  const isAuthRoute = ["/login", "/register"].some(route => pathname === route || pathname.startsWith(route));

  // 1. Redirect authenticated users away from auth pages
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. Protect private routes
  if (!token && !isPublicRoute && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
