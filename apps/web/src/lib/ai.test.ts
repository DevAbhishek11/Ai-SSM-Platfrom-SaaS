import { afterEach, describe, expect, it, vi } from "vitest";

// The loader now runs as the signed-in user, so the cookie store is stubbed.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ssm_at" ? { name, value: "test-access-token" } : undefined)
  })
}));

const { getAiRouterStatus, localRouterStatus } = await import("./ai");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AI router status", () => {
  it("describes the local-only fallback chain when nothing is configured", () => {
    const status = localRouterStatus();

    expect(status.activeProvider).toBe("local");
    expect(status.fallbackProvider).toBe("local");
    expect(status.providers.map((provider) => provider.provider)).toEqual([
      "local",
      "ollama",
      "anthropic",
      "openai"
    ]);
    expect(status.providers.filter((provider) => provider.configured)).toHaveLength(1);
  });

  it("uses live API status when the API responds", async () => {
    const payload = {
      ...localRouterStatus(),
      activeProvider: "anthropic",
      priority: ["anthropic", "local"]
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))
    );

    const status = await getAiRouterStatus();

    expect(status.activeProvider).toBe("anthropic");
    expect(status.priority).toEqual(["anthropic", "local"]);

    // The caller's bearer token must be forwarded to the API.
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-access-token");
  });

  it("falls back to the local view when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      })
    );

    const status = await getAiRouterStatus();

    expect(status.activeProvider).toBe("local");
  });
});
