import { NextResponse, type NextRequest } from "next/server";
import { serverApiBaseUrl } from "@/lib/api";
import { CSRF_COOKIE, CSRF_HEADER, isSafeMethod, isSameOrigin, timingSafeEquals } from "@/lib/csrf";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/session";

/**
 * Authenticated same-origin API proxy.
 *
 * Browser code calls `/api/...` and this handler forwards the request to the
 * API with the caller's access token attached. The token itself stays in an
 * httpOnly cookie, so client JavaScript never holds a bearer credential. When
 * the access token has expired the proxy transparently rotates the refresh
 * token once and replays the original request.
 *
 * Because the credential is a cookie, this endpoint is the CSRF boundary: any
 * state-changing request must prove it came from our own page by echoing the
 * `ssm_csrf` cookie in a header, and by carrying a same-origin `Origin`.
 */

const API_ORIGIN = (process.env.API_PROXY_TARGET ?? "http://localhost:4000").replace(/\/+$/, "");
const API_PREFIX = `${API_ORIGIN}/api`;

/** Upper bound on a single upstream call, so a hung API cannot pin a worker. */
const UPSTREAM_TIMEOUT_MS = Number(process.env.API_PROXY_TIMEOUT_MS ?? 30_000);

/** Hard ceiling on a proxied request body. */
const MAX_BODY_BYTES = Number(process.env.API_PROXY_MAX_BODY_BYTES ?? 2 * 1024 * 1024);

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length"
]);

/** Headers a client must never be able to inject into the upstream request. */
const STRIPPED_REQUEST_HEADERS = new Set(["cookie", "authorization", "x-api-key", "x-forwarded-host"]);

type RefreshResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const errorResponse = (status: number, code: string, message: string) =>
  NextResponse.json(
    { statusCode: status, code, message, timestamp: new Date().toISOString() },
    { status }
  );

/**
 * Rejects any segment that could walk out of the `/api` prefix once `fetch`
 * normalises the URL. `encodeURIComponent` does *not* escape dots, so a path of
 * `["..", "..", "admin"]` would otherwise resolve to the API root and reach an
 * endpoint the proxy is not supposed to expose.
 */
const isTraversalSegment = (segment: string): boolean =>
  segment.length === 0 ||
  segment === "." ||
  segment === ".." ||
  segment.includes("/") ||
  segment.includes("\\") ||
  /%2e%2e|%2f|%5c/i.test(segment);

const buildTargetUrl = (request: NextRequest, path: string[]): string => {
  const search = request.nextUrl.search;
  return `${API_PREFIX}/${path.map(encodeURIComponent).join("/")}${search}`;
};

const forwardHeaders = (request: NextRequest, accessToken?: string): Headers => {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (!HOP_BY_HOP.has(name) && !STRIPPED_REQUEST_HEADERS.has(name)) {
      headers.set(key, value);
    }
  });

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return headers;
};

/**
 * Double-submit CSRF check plus an Origin check. Safe methods are exempt because
 * they cannot change state and the API enforces its own authorization anyway.
 */
const csrfRejection = (request: NextRequest): NextResponse | undefined => {
  if (isSafeMethod(request.method)) {
    return undefined;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!isSameOrigin(origin, host)) {
    return errorResponse(403, "csrf_origin_mismatch", "Cross-origin requests are not allowed.");
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER) ?? undefined;

  // No session cookie means no cookie credential to abuse, so there is nothing
  // for CSRF to steal; let the API answer with its own 401.
  const hasSessionCookie =
    request.cookies.has(ACCESS_TOKEN_COOKIE) || request.cookies.has(REFRESH_TOKEN_COOKIE);
  if (!hasSessionCookie) {
    return undefined;
  }

  if (!timingSafeEquals(cookieToken, headerToken)) {
    return errorResponse(
      403,
      "csrf_token_invalid",
      "Missing or invalid CSRF token. Reload the page and try again."
    );
  }

  return undefined;
};

const refreshTokens = async (refreshToken: string): Promise<RefreshResult | undefined> => {
  try {
    const response = await fetch(`${serverApiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });

    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as RefreshResult;
  } catch {
    return undefined;
  }
};

const toNextResponse = async (upstream: Response): Promise<NextResponse> => {
  const body = await upstream.arrayBuffer();
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (!HOP_BY_HOP.has(name) && name !== "content-encoding" && name !== "set-cookie") {
      headers.set(key, value);
    }
  });

  return new NextResponse(body, { status: upstream.status, headers });
};

const sessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge
});

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const rejected = csrfRejection(request);
  if (rejected) {
    return rejected;
  }

  const { path } = await context.params;
  if (!path || path.length === 0) {
    return errorResponse(404, "not_found", "No API path was provided.");
  }

  if (path.some(isTraversalSegment)) {
    return errorResponse(400, "invalid_path", "The requested API path is not valid.");
  }

  const target = buildTargetUrl(request, path);
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Buffer the body once so the request can be replayed after a token refresh.
  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.arrayBuffer();
    } catch {
      return errorResponse(400, "invalid_body", "The request body could not be read.");
    }

    if (body.byteLength > MAX_BODY_BYTES) {
      return errorResponse(413, "payload_too_large", "The request body is too large.");
    }
  }

  const send = (token?: string) =>
    fetch(target, {
      method: request.method,
      headers: forwardHeaders(request, token),
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });

  let upstream: Response;
  try {
    upstream = await send(accessToken);
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return timedOut
      ? errorResponse(504, "upstream_timeout", "The API did not respond in time.")
      : errorResponse(502, "upstream_unreachable", "The API is unreachable right now.");
  }

  if (upstream.status !== 401 || !refreshToken) {
    return toNextResponse(upstream);
  }

  const refreshed = await refreshTokens(refreshToken);
  if (!refreshed) {
    const response = await toNextResponse(upstream);
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  let retried: Response;
  try {
    retried = await send(refreshed.accessToken);
  } catch {
    return errorResponse(502, "upstream_unreachable", "The API is unreachable right now.");
  }

  const response = await toNextResponse(retried);
  response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, {
    ...sessionCookieOptions(Math.max(refreshed.expiresIn - 15, 60))
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, {
    ...sessionCookieOptions(60 * 60 * 24 * 30)
  });

  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const dynamic = "force-dynamic";
