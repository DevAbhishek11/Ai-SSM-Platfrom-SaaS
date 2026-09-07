import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined })
}));

const { NextRequest } = await import("next/server");
const { proxy, config } = await import("./proxy");

/**
 * Route protection and silent renewal. The API remains the authority, but this
 * layer decides who gets to see the dashboard shell at all - and it is where a
 * session that has quietly died gets turned into a clean login redirect.
 */

const CSRF = "a".repeat(64);

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
    const response = await proxy(buildRequest("/", { ssm_at: "access-token" }));

    expect(response.headers.get("location")).toBeNull();
    const cookie = setCookieHeader(response);
    expect(cookie).toMatch(/ssm_csrf=[0-9a-f]{64}/);
    // The token has to be readable by our own JavaScript to be echoed back.
    expect(cookie).not.toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("leaves an existing CSRF token alone", async () => {
    const response = await proxy(buildRequest("/", { ssm_at: "access-token", ssm_csrf: CSRF }));

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

  it("treats an unreachable API during renewal as an expired session rather than a crash", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));

    const response = await proxy(buildRequest("/", { ssm_rt: "refresh-token" }));

    expect(new URL(response.headers.get("location") ?? "", "http://localhost:3000").pathname).toBe(
      "/login"
    );
  });

  it("keeps signed-in users away from the login and register screens", async () => {
    for (const path of ["/login", "/register"]) {
      const response = await proxy(buildRequest(path, { ssm_at: "access-token" }));
      expect(new URL(response.headers.get("location") ?? "", "http://localhost:3000").pathname).toBe(
        "/"
      );
    }
  });

  it("lets anonymous visitors reach the login and register screens", async () => {
    for (const path of ["/login", "/register"]) {
      const response = await proxy(buildRequest(path));
      expect(response.headers.get("location")).toBeNull();
    }
  });
});
