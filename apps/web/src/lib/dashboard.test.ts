import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ssm_at" ? { name, value: "test-access-token" } : undefined)
  })
}));

const { getDashboardOverview } = await import("./dashboard");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard overview loader", () => {
  it("calls the API as the signed-in user", async () => {
    const payload = { workspace: { id: "ws-1", name: "Live workspace" }, metrics: { scheduledPosts: 7 } };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const overview = await getDashboardOverview();

    expect(overview.workspace.name).toBe("Live workspace");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/dashboard\/overview$/);
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-access-token");
  });

  it("falls back to bundled fixtures when the API rejects the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Unauthorized", { status: 401 }))
    );

    const overview = await getDashboardOverview();

    expect(overview.workspace.id).toBeTruthy();
    expect(overview.posts.length).toBeGreaterThan(0);
    expect(overview.alerts[0]?.severity).toBe("warning");
  });

  it("falls back when the API cannot be reached at all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      })
    );

    await expect(getDashboardOverview()).resolves.toMatchObject({
      metrics: { connectedAccounts: expect.any(Number) }
    });
  });
});
