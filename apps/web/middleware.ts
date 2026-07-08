import { type NextRequest, NextResponse } from "next/server";

/**
 * When `redirect_to` is downgraded to the Site URL (e.g. callback URL not
 * allowlisted), Supabase still appends PKCE or OTP params to `/`. Forward those
 * to `/auth/callback` so the route handler can set cookies and redirect.
 */
function shouldForwardRootAuthSearch(url: URL): boolean {
  if (url.pathname !== "/") return false;
  if (url.searchParams.has("code")) return true;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  return Boolean(tokenHash && type);
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  if (!shouldForwardRootAuthSearch(url)) {
    return NextResponse.next();
  }

  const dest = new URL("/auth/callback", request.url);
  url.searchParams.forEach((value, key) => {
    dest.searchParams.set(key, value);
  });
  if (!dest.searchParams.has("next")) {
    const t = dest.searchParams.get("type");
    dest.searchParams.set("next", t === "invite" ? "/set-password" : "/dashboards");
  }

  return NextResponse.redirect(dest, 303);
}

export const config = {
  matcher: ["/"],
};
