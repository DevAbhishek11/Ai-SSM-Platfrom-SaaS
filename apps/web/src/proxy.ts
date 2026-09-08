import { NextResponse, type NextRequest } from "next/server";
import { CSRF_COOKIE, generateCsrfToken } from "@/lib/csrf";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/session";
import { accessTokenNeedsRenewal, renewSession } from "@/lib/session-renewal";

const PUBLIC_PATHS = ["/login", "/register"];

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Makes sure a CSRF token exists for any request that carries a session cookie.
 * Cookies can be evicted independently, and a session created before this
 * defence existed has none - without a top-up the first mutation would 403.
 */
const ensureCsrfToken = (request: NextRequest, response: NextResponse): NextResponse => {
  if (request.cookies.has(CSRF_COOKIE)) {
    return response;
  }

  response.cookies.set(CSRF_COOKIE, generateCsrfToken(), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE
  });
  return response;
};

const API_ORIGIN = (
  process.env.API_INTERNAL_URL ??
  `${(process.env.API_PROXY_TARGET ?? "http://localhost:4000").replace(/\/+$/, "")}/api`
).replace(/\/+$/, "");

/**
 * Rewrites the cookie header the *current* render will see.
 *
 * `response.cookies.set` only instructs the browser; the server components
 * rendering this very request would still read the spent access token, call
 * `/auth/me`, get a 401 and redirect to the login screen — undoing the renewal
 * that just succeeded. Forwarding the new value makes the renewal effective
 * immediately instead of one round trip later.
 */
const forwardRenewedCookies = (
  request: NextRequest,
  tokens: { accessToken: string; refreshToken: string }
): Headers => {
  const jar = new Map(request.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
  jar.set(ACCESS_TOKEN_COOKIE, tokens.accessToken);
  jar.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken);

  const headers = new Headers(request.headers);
  headers.set(
    "cookie",
    [...jar].map(([name, value]) => `${name}=${value}`).join("; ")
  );
  return headers;
};

const applyTokens = (
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
): NextResponse => {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: Math.max(tokens.expiresIn - 15, 60)
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: REFRESH_COOKIE_MAX_AGE
  });
  return response;
};

/**
 * Route protection and silent session renewal (Next.js "proxy" convention,
 * formerly `middleware.ts`).
 *
 * The API is the real authority - this only keeps unauthenticated visitors out
 * of the dashboard shell and swaps a spent access token for a fresh one so a
 * signed-in user is never bounced to the login screen mid-session.
 *
 * Two rules earn their keep here:
 *
 *  - Renewal is *proactive*. Waiting for the access token to be rejected does
 *    not work, because the request that discovers the 401 is usually a server
 *    render, and a server render cannot set cookies. By the time anything can
 *    write a new cookie the user has already been redirected to the login page.
 *  - A refresh that could not reach the API is not a dead session. Deleting the
 *    refresh cookie on a network blip signs everybody out over a hiccup, and
 *    they cannot get back in until they type their password again.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const needsRenewal = accessTokenNeedsRenewal(accessToken);

  if (isPublicPath) {
    // Someone with a working session has no business on the login screen.
    if (accessToken && !needsRenewal) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // A usable refresh token also means "already signed in" - but only if the
    // exchange actually succeeds. Bouncing on the mere presence of the cookie
    // is what turns an unreachable API into a redirect loop between here and
    // the dashboard.
    if (refreshToken) {
      const renewal = await renewSession(API_ORIGIN, refreshToken);
      if (renewal.status === "renewed") {
        return applyTokens(NextResponse.redirect(new URL("/", request.url)), renewal);
      }
      if (renewal.status === "rejected") {
        const response = NextResponse.next();
        response.cookies.delete(ACCESS_TOKEN_COOKIE);
        response.cookies.delete(REFRESH_TOKEN_COOKIE);
        return response;
      }
    }

    return NextResponse.next();
  }

  if (!needsRenewal) {
    return ensureCsrfToken(request, NextResponse.next());
  }

  if (refreshToken) {
    const renewal = await renewSession(API_ORIGIN, refreshToken);

    if (renewal.status === "renewed") {
      const response = NextResponse.next({
        request: { headers: forwardRenewedCookies(request, renewal) }
      });
      return ensureCsrfToken(request, applyTokens(response, renewal));
    }

    if (renewal.status === "unreachable") {
      // The API is down; that is not the user's session ending. Keep every
      // cookie intact and let the page render its own failure state, so the
      // moment the API is back a reload restores the session.
      return ensureCsrfToken(request, NextResponse.next());
    }
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", `${pathname}${search}`);
  }
  if (refreshToken) {
    // A refresh token the API actively rejected means the session really is over.
    loginUrl.searchParams.set("reason", "session-expired");
  }

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(CSRF_COOKIE);
  return response;
}

export const config = {
  matcher: [
    /**
     * Everything except Next internals, the API proxy (which authenticates
     * itself), and static files.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)"
  ]
};
