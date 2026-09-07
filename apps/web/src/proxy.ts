import { NextResponse, type NextRequest } from "next/server";
import { CSRF_COOKIE, generateCsrfToken } from "@/lib/csrf";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/register"];

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

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
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
};

const API_ORIGIN = (
  process.env.API_INTERNAL_URL ??
  `${(process.env.API_PROXY_TARGET ?? "http://localhost:4000").replace(/\/+$/, "")}/api`
).replace(/\/+$/, "");

/**
 * Route protection and silent session renewal (Next.js "proxy" convention,
 * formerly `middleware.ts`).
 *
 * The API is the real authority - this only keeps unauthenticated visitors out
 * of the dashboard shell and swaps an expired access token for a fresh one so a
 * signed-in user is never bounced to the login screen mid-session.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (isPublicPath) {
    if (accessToken || refreshToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (accessToken) {
    return ensureCsrfToken(request, NextResponse.next());
  }

  if (refreshToken) {
    const renewed = await renew(refreshToken);
    if (renewed) {
      const response = NextResponse.next();
      response.cookies.set(ACCESS_TOKEN_COOKIE, renewed.accessToken, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: Math.max(renewed.expiresIn - 15, 60)
      });
      response.cookies.set(REFRESH_TOKEN_COOKIE, renewed.refreshToken, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 30
      });
      return ensureCsrfToken(request, response);
    }
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", `${pathname}${search}`);
  }
  if (refreshToken) {
    // A refresh token that no longer works means the session really is over.
    loginUrl.searchParams.set("reason", "session-expired");
  }

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(CSRF_COOKIE);
  return response;
}

async function renew(refreshToken: string) {
  try {
    const response = await fetch(`${API_ORIGIN}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      // A slow API must not hold up navigation; a miss just means a login bounce.
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  } catch {
    return undefined;
  }
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
