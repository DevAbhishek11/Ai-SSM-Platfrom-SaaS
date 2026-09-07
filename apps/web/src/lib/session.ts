import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { serverApiBaseUrl } from "./api";

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

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/"
} as const;

/**
 * Session tokens live in httpOnly cookies: never in localStorage, and never in
 * a JS-readable cookie, so an XSS bug cannot exfiltrate a usable credential.
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
}

export async function clearTokens(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
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
      cache: "no-store"
    });

    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as Session;
  } catch {
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
    cache: init.cache ?? "no-store"
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
