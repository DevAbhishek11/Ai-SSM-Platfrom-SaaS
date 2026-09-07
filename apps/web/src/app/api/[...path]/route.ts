import { NextResponse, type NextRequest } from "next/server";
import { serverApiBaseUrl } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/session";

/**
 * Authenticated same-origin API proxy.
 *
 * Browser code calls `/api/...` and this handler forwards the request to the
 * API with the caller's access token attached. The token itself stays in an
 * httpOnly cookie, so client JavaScript never holds a bearer credential. When
 * the access token has expired the proxy transparently rotates the refresh
 * token once and replays the original request.
 */

const API_ORIGIN = (process.env.API_PROXY_TARGET ?? "http://localhost:4000").replace(/\/+$/, "");
const API_PREFIX = `${API_ORIGIN}/api`;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length"
]);

type RefreshResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const buildTargetUrl = (request: NextRequest, path: string[]): string => {
  const search = request.nextUrl.search;
  return `${API_PREFIX}/${path.map(encodeURIComponent).join("/")}${search}`;
};

const forwardHeaders = (request: NextRequest, accessToken?: string): Headers => {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "cookie") {
      headers.set(key, value);
    }
  });

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  } else {
    headers.delete("authorization");
  }

  return headers;
};

const refreshTokens = async (refreshToken: string): Promise<RefreshResult | undefined> => {
  try {
    const response = await fetch(`${serverApiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store"
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
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "content-encoding") {
      headers.set(key, value);
    }
  });

  return new NextResponse(body, { status: upstream.status, headers });
};

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = buildTargetUrl(request, path ?? []);
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Buffer the body once so the request can be replayed after a token refresh.
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  const send = (token?: string) =>
    fetch(target, {
      method: request.method,
      headers: forwardHeaders(request, token),
      body,
      redirect: "manual",
      cache: "no-store"
    });

  let upstream: Response;
  try {
    upstream = await send(accessToken);
  } catch {
    return NextResponse.json({ message: "API is unreachable" }, { status: 502 });
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

  const retried = await send(refreshed.accessToken);
  const response = await toNextResponse(retried);
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: Math.max(refreshed.expiresIn - 15, 60)
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const dynamic = "force-dynamic";
