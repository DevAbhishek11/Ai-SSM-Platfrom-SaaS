import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined })
}));

const { NextRequest } = await import("next/server");
const { proxy, config } = await import("./proxy");
const { resetSingleFlight } = await import("./lib/session-renewal");

/**
 * Route protection and silent renewal. The API remains the authority, but this
 * layer decides who gets to see the dashboard shell at all - and it is where a
 * session that has quietly died gets turned into a clean login redirect.
 */

const CSRF = "a".repeat(64);

/**
 * A realistic access cookie. The proxy reads the `exp` claim to decide whether
 * to renew ahead of time, so a placeholder string is not a stand-in for a real
 * token: an unparseable one is deliberately treated as spent.
 */
const accessToken = (expiresInSeconds: number): string => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode({
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    sub: "user"
  })}.signature`;
};

const FRESH = accessToken(600);

const stubRefresh = (impl: () => unknown) => {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
};

const buildRequest = (path: string, cookies: Record<string, string> = {}) => {
  const headers = new Headers({ host: "localhost:3000" });
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  return new NextRequest(`http://localhost:3000${path}`, { headers });
};

const setCookieHeader = (response: Response) => response.headers.getSetCookie().join("\n");

describe("route protection proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // Concurrent renewals are de-duplicated by token; without this a stubbed
    // response could leak into the next case.
    resetSingleFlight();
  });

  it("excludes the API proxy and static assets from the matcher", () => {
    const matcher = new RegExp(config.matcher[0].replace(/^\/\(/, "^/(").replace(/\)$/, ")$"));

    expect(matcher.test("/")).toBe(true);
    expect(matcher.test("/settings")).toBe(true);
    expect(matcher.test("/api/posts")).toBe(false);
    expect(matcher.test("/_next/static/chunk.js")).toBe(false);
    expect(matcher.test("/favicon.ico")).toBe(false);
  });

  it("sends an anonymous visitor to the login page with a return path", async () => {
    const response = await proxy(buildRequest("/analytics?range=30d"));
    const location = new URL(response.headers.get("location") ?? "", "http://localhost:3000");

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/analytics?range=30d");
    expect(location.searchParams.get("reason")).toBeNull();
  });

  it("omits the return path when the visitor asked for the dashboard root", async () => {
    const response = await proxy(buildRequest("/"));
    const location = new URL(response.headers.get("location") ?? "", "http://localhost:3000");

    expect(location.searchParams.get("next")).toBeNull();
  });

  it("lets a signed-in request through and plants a CSRF token if one is missing", async () => {
    const response = await proxy(buildRequest("/", { ssm_at: FRESH }));

    expect(response.headers.get("location")).toBeNull();
    const cookie = setCookieHeader(response);
    expect(cookie).toMatch(/ssm_csrf=[0-9a-f]{64}/);
    // The token has to be readable by our own JavaScript to be echoed back.
    expect(cookie).not.toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("leaves an existing CSRF token alone", async () => {
    const response = await proxy(buildRequest("/", { ssm_at: FRESH, ssm_csrf: CSRF }));

    expect(setCookieHeader(response)).not.toMatch(/ssm_csrf/);
  });

  it("renews a missing access token from the refresh cookie without bouncing the user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ accessToken: "fresh-access", refreshToken: "fresh-refresh", expiresIn: 900 }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const response = await proxy(buildRequest("/calendar", { ssm_rt: "refresh-token" }));
    const cookie = setCookieHeader(response);

    expect(response.headers.get("location")).toBeNull();
    expect(cookie).toMatch(/ssm_at=fresh-access/);
    expect(cookie).toMatch(/ssm_rt=fresh-refresh/);
    expect(cookie).toMatch(/ssm_csrf=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("reports an expired session and clears every cookie when renewal fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));

    const response = await proxy(buildRequest("/calendar", { ssm_rt: "dead-token", ssm_csrf: CSRF }));
    const location = new URL(response.headers.get("location") ?? "", "http://localhost:3000");
    const cookie = setCookieHeader(response);

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("reason")).toBe("session-expired");
    expect(cookie).toMatch(/ssm_at=;/);
    expect(cookie).toMatch(/ssm_rt=;/);
    expect(cookie).toMatch(/ssm_csrf=;/);
  });

  it("keeps the session when the API cannot be reached", async () => {
    // An API blip is not the user's session ending. Deleting the refresh cookie
    // here would sign everyone out over a hiccup and force them to retype a
    // password to get back in.
    stubRefresh(async () => {
      throw new TypeError("fetch failed");
    });

    const response = await proxy(buildRequest("/", { ssm_rt: "refresh-token" }));
    const cookie = setCookieHeader(response);

    expect(response.headers.get("location")).toBeNull();
    expect(cookie).not.toMatch(/ssm_rt=;/);
  });

  it("keeps the session when the API is returning 500s", async () => {
    stubRefresh(async () => new Response("boom", { status: 500 }));

    const response = await proxy(buildRequest("/", { ssm_rt: "refresh-token" }));

    expect(response.headers.get("location")).toBeNull();
    expect(setCookieHeader(response)).not.toMatch(/ssm_rt=;/);
  });

  describe("proactive renewal", () => {
    it("renews before the token expires rather than after it is rejected", async () => {
      // The request that would discover the 401 is a server render, and a
      // server render cannot set cookies - so waiting is how a user ends up on
      // the login screen holding a perfectly good refresh token.
      const spy = stubRefresh(
        async () =>
          new Response(
            JSON.stringify({ accessToken: "fresh", refreshToken: "fresh-rt", expiresIn: 900 }),
            { status: 200 }
          )
      );

      const response = await proxy(
        buildRequest("/", { ssm_at: accessToken(20), ssm_rt: "refresh-token" })
      );

      expect(spy).toHaveBeenCalledTimes(1);
      expect(setCookieHeader(response)).toMatch(/ssm_at=fresh/);
    });

    it("hands the renewed token to the render that triggered it", async () => {
      // Otherwise the server components on this very request still read the
      // spent token, get a 401 from /auth/me and redirect to the login screen -
      // undoing the renewal that just succeeded.
      stubRefresh(
        async () =>
          new Response(
            JSON.stringify({ accessToken: "fresh", refreshToken: "fresh-rt", expiresIn: 900 }),
            { status: 200 }
          )
      );

      const response = await proxy(buildRequest("/", { ssm_rt: "refresh-token" }));

      expect(response.headers.get("x-middleware-request-cookie")).toContain("ssm_at=fresh");
      expect(response.headers.get("x-middleware-request-cookie")).toContain("ssm_rt=fresh-rt");
    });

    it("preserves unrelated cookies when forwarding the renewed session", async () => {
      stubRefresh(
        async () =>
          new Response(
            JSON.stringify({ accessToken: "fresh", refreshToken: "fresh-rt", expiresIn: 900 }),
            { status: 200 }
          )
      );

      const response = await proxy(
        buildRequest("/", { ssm_rt: "refresh-token", ssm_theme: "dark" })
      );

      expect(response.headers.get("x-middleware-request-cookie")).toContain("ssm_theme=dark");
    });

    it("does not renew a token with plenty of life left", async () => {
      const spy = stubRefresh(async () => new Response("{}", { status: 200 }));

      await proxy(buildRequest("/", { ssm_at: FRESH, ssm_rt: "refresh-token" }));

      expect(spy).not.toHaveBeenCalled();
    });

    it("renews an access cookie that is not a readable token", async () => {
      const spy = stubRefresh(
        async () =>
          new Response(
            JSON.stringify({ accessToken: "fresh", refreshToken: "fresh-rt", expiresIn: 900 }),
            { status: 200 }
          )
      );

      await proxy(buildRequest("/", { ssm_at: "garbage", ssm_rt: "refresh-token" }));

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("makes one call when several requests race", async () => {
      // Two tabs and a prefetch waking together must not rotate a single-use
      // token three times.
      const spy = stubRefresh(
        async () =>
          new Response(
            JSON.stringify({ accessToken: "fresh", refreshToken: "fresh-rt", expiresIn: 900 }),
            { status: 200 }
          )
      );

      await Promise.all([
        proxy(buildRequest("/", { ssm_rt: "shared-token" })),
        proxy(buildRequest("/calendar", { ssm_rt: "shared-token" })),
        proxy(buildRequest("/analytics", { ssm_rt: "shared-token" }))
      ]);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps signed-in users away from the login and register screens", async () => {
    for (const path of ["/login", "/register"]) {
      const response = await proxy(buildRequest(path, { ssm_at: FRESH }));
      expect(new URL(response.headers.get("location") ?? "", "http://localhost:3000").pathname).toBe(
        "/"
      );
    }
  });

  it("signs a returning visitor straight back in from the refresh cookie", async () => {
    stubRefresh(
      async () =>
        new Response(
          JSON.stringify({ accessToken: "fresh", refreshToken: "fresh-rt", expiresIn: 900 }),
          { status: 200 }
        )
    );

    const response = await proxy(buildRequest("/login", { ssm_rt: "refresh-token" }));

    expect(new URL(response.headers.get("location") ?? "", "http://localhost:3000").pathname).toBe(
      "/"
    );
    expect(setCookieHeader(response)).toMatch(/ssm_at=fresh/);
  });

  it("shows the login form instead of looping when the API is down", async () => {
    // Bouncing to "/" on the mere presence of a refresh cookie, while the
    // dashboard bounces back here because the session cannot be resolved, is an
    // infinite redirect. The exchange has to actually succeed to justify the
    // bounce.
    stubRefresh(async () => {
      throw new TypeError("fetch failed");
    });

    const response = await proxy(buildRequest("/login", { ssm_rt: "refresh-token" }));

    expect(response.headers.get("location")).toBeNull();
    expect(setCookieHeader(response)).not.toMatch(/ssm_rt=;/);
  });

  it("clears a rejected refresh cookie so the login form is usable", async () => {
    stubRefresh(async () => new Response("{}", { status: 401 }));

    const response = await proxy(buildRequest("/login", { ssm_rt: "dead-token" }));

    expect(response.headers.get("location")).toBeNull();
    expect(setCookieHeader(response)).toMatch(/ssm_rt=;/);
  });

  it("lets anonymous visitors reach the login and register screens", async () => {
    for (const path of ["/login", "/register"]) {
      const response = await proxy(buildRequest(path));
      expect(response.headers.get("location")).toBeNull();
    }
  });
});
