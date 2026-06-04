import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Simplified matchers to avoid bundler issues in Edge Runtime
const isPublicRoute = createRouteMatcher(["/", "/webhooks(.*)"]);
const isAuthRoute = createRouteMatcher(["/login(.*)", "/register(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const { pathname } = request.nextUrl;

  // 1. Redirect authenticated users away from auth pages
  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. Protect private routes
  if (!userId && !isPublicRoute(request) && !isAuthRoute(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
