import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { serverApiBaseUrl } from "./api";
import { CSRF_COOKIE, generateCsrfToken } from "./csrf";

export const ACCESS_TOKEN_COOKIE = "ssm_at";
export const REFRESH_TOKEN_COOKIE = "ssm_rt";

export type Membership = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  timezone: string;
  language: string;
  status: string;
  memberships: Membership[];
  lastLoginAt?: string;
};

export type Session = {
  user: SessionUser;
  workspace: Membership;
  role: string;
  permissions: string[];
  sessionId?: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const isProduction = process.env.NODE_ENV === "production";

/**
 * Server-side reads must never hang: a wedged API would otherwise hold an SSR
 * render open until the platform's own request timeout kills the whole page.
 */
const SERVER_FETCH_TIMEOUT_MS = Number(process.env.API_SERVER_TIMEOUT_MS ?? 10_000);

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/"
} as const;

/**
 * Session tokens live in httpOnly cookies: never in localStorage, and never in
 * a JS-readable cookie, so an XSS bug cannot exfiltrate a usable credential.
 *
 * The CSRF token is the deliberate exception - it *must* be readable by our own
 * JavaScript so it can be echoed back in a header. It is not a credential on its
 * own: it only proves the request was made by a page on this origin.
 */
export async function persistTokens(tokens: TokenPair): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: Math.max(tokens.expiresIn - 15, 60)
  });
  store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions,
    maxAge: 60 * 60 * 24 * 30
  });
  store.set(CSRF_COOKIE, generateCsrfToken(), {
    httpOnly: false,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearTokens(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
  store.delete(CSRF_COOKIE);
}

export async function readAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function readRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

/**
 * Resolves the current session from the API.
 *
 * Returns `undefined` rather than throwing so layouts can redirect instead of
 * rendering an error page when a token has expired.
 */
export const getSession = cache(async (): Promise<Session | undefined> => {
  const accessToken = await readAccessToken();
  if (!accessToken) {
    return undefined;
  }

  try {
    const response = await fetch(`${serverApiBaseUrl}/auth/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS)
    });

    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as Session;
  } catch {
    // Unreachable API, timeout, or malformed payload: treat as "no session" so
    // the caller redirects to login instead of rendering a broken shell.
    return undefined;
  }
});

/** Convenience helper for RSC data loads that must run as the signed-in user. */
export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = await readAccessToken();
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${serverApiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
    signal: init.signal ?? AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS)
  });
}

export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
