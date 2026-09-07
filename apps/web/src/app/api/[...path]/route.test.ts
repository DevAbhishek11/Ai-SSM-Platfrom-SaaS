import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined })
}));

const { NextRequest } = await import("next/server");
const { GET, POST } = await import("./route");

/**
 * The proxy is the only place a cookie-authenticated request is turned into a
 * bearer-authenticated one, which makes it the CSRF boundary for the whole app.
 */

const CSRF = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const params = (path: string[]) => ({ params: Promise.resolve({ path }) });

const buildRequest = (
  {
    method = "POST",
    path = "/api/posts",
    cookies = `ssm_at=access-token; ssm_rt=refresh-token; ssm_csrf=${CSRF}`,
    origin = "http://localhost:3000",
    csrfHeader = CSRF as string | null,
    body = JSON.stringify({ title: "hello" })
  }: {
    method?: string;
    path?: string;
    cookies?: string;
    origin?: string | null;
    csrfHeader?: string | null;
    body?: string | null;
  } = {}
) => {
  const headers = new Headers({ "content-type": "application/json" });
  if (cookies) headers.set("cookie", cookies);
  if (origin) headers.set("origin", origin);
  if (csrfHeader) headers.set("x-csrf-token", csrfHeader);
  headers.set("host", "localhost:3000");

  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : body
  });
};

const upstreamOk = (body: unknown = { ok: true }, status = 200) =>
  vi.fn(async () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
  );

describe("API proxy CSRF enforcement", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards a write that carries a matching token and same-origin header", async () => {
    const fetchMock = upstreamOk({ id: "post-1" }, 201);
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(buildRequest(), params(["posts"]));

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/posts");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer access-token");
  });

  it("rejects a write with no CSRF header", async () => {
    const fetchMock = upstreamOk();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(buildRequest({ csrfHeader: null }), params(["posts"]));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("csrf_token_invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a write whose token does not match the cookie", async () => {
    const fetchMock = upstreamOk();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      buildRequest({ csrfHeader: CSRF.replace("0", "f") }),
      params(["posts"])
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a write from a foreign origin even with a stolen token value", async () => {
    const fetchMock = upstreamOk();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      buildRequest({ origin: "https://evil.example.com" }),
      params(["posts"])
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("csrf_origin_mismatch");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows reads without a token because they cannot change state", async () => {
    const fetchMock = upstreamOk({ items: [] });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      buildRequest({ method: "GET", csrfHeader: null, body: null }),
      params(["posts"])
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("lets an anonymous write through so the API can answer with its own 401", async () => {
    const fetchMock = upstreamOk({ message: "Unauthorized" }, 401);
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      buildRequest({ cookies: "", csrfHeader: null }),
      params(["posts"])
    );

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("API proxy request handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never forwards the browser's cookies or a caller-supplied authorization header", async () => {
    const fetchMock = upstreamOk();
    vi.stubGlobal("fetch", fetchMock);

    const request = buildRequest();
    request.headers.set("authorization", "Bearer attacker-supplied");
    request.headers.set("x-api-key", "attacker-key");

    await POST(request, params(["posts"]));

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const forwarded = new Headers(init.headers);
    expect(forwarded.get("cookie")).toBeNull();
    expect(forwarded.get("x-api-key")).toBeNull();
    expect(forwarded.get("authorization")).toBe("Bearer access-token");
  });

  it("reports an unreachable API as a 502 rather than crashing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));

    const response = await POST(buildRequest(), params(["posts"]));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.code).toBe("upstream_unreachable");
  });

  it("reports an API that never answers as a 504", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new DOMException("The operation timed out", "TimeoutError");
    }));

    const response = await POST(buildRequest(), params(["posts"]));
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body.code).toBe("upstream_timeout");
  });

  it("rejects a body larger than the proxy limit", async () => {
    const fetchMock = upstreamOk();
    vi.stubGlobal("fetch", fetchMock);

    const huge = JSON.stringify({ blob: "x".repeat(3 * 1024 * 1024) });
    const response = await POST(buildRequest({ body: huge }), params(["media"]));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.code).toBe("payload_too_large");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes once and replays the original request on a 401", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith("/auth/refresh")) {
        return new Response(
          JSON.stringify({
            accessToken: "new-access",
            refreshToken: "new-refresh",
            expiresIn: 900
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ ok: calls.length > 1 }), {
        status: calls.length === 1 ? 401 : 200,
        headers: { "content-type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(buildRequest(), params(["posts"]));

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(3);
    expect(calls[1]).toMatch(/\/auth\/refresh$/);

    // Rotated tokens are written back as httpOnly cookies.
    const setCookie = response.headers.getSetCookie().join("\n");
    expect(setCookie).toMatch(/ssm_at=new-access/);
    expect(setCookie).toMatch(/ssm_rt=new-refresh/);
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it("clears the session cookies when the refresh token is dead", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/auth/refresh")
        ? new Response(JSON.stringify({ message: "Invalid" }), { status: 401 })
        : new Response(JSON.stringify({ message: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" }
          })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(buildRequest(), params(["posts"]));
    const setCookie = response.headers.getSetCookie().join("\n");

    expect(response.status).toBe(401);
    expect(setCookie).toMatch(/ssm_at=;/);
    expect(setCookie).toMatch(/ssm_rt=;/);
  });

  it("does not relay upstream Set-Cookie headers to the browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json", "set-cookie": "upstream=value" }
        })
      )
    );

    const response = await GET(
      buildRequest({ method: "GET", csrfHeader: null, body: null }),
      params(["posts"])
    );

    expect(response.headers.getSetCookie().join("")).not.toMatch(/upstream=value/);
  });

  it("preserves the query string when forwarding", async () => {
    const fetchMock = upstreamOk();
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      buildRequest({
        method: "GET",
        path: "/api/posts?status=scheduled&limit=10",
        csrfHeader: null,
        body: null
      }),
      params(["posts"])
    );

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("http://localhost:4000/api/posts?status=scheduled&limit=10");
  });

  it("refuses a path that would traverse out of the API prefix", async () => {
    const fetchMock = upstreamOk();
    vi.stubGlobal("fetch", fetchMock);

    for (const traversal of [["..", "..", "admin"], ["posts", ".."], ["a%2fb"], [""], ["."]]) {
      const response = await GET(
        buildRequest({ method: "GET", csrfHeader: null, body: null }),
        params(traversal)
      );

      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("invalid_path");
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps ordinary segments intact and escaped", async () => {
    const fetchMock = upstreamOk();
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      buildRequest({ method: "GET", csrfHeader: null, body: null }),
      params(["workflow", "posts", "post 1", "approve"])
    );

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("http://localhost:4000/api/workflow/posts/post%201/approve");
  });

  it("404s a request with no path segments", async () => {
    const fetchMock = upstreamOk();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      buildRequest({ method: "GET", csrfHeader: null, body: null }),
      params([])
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
