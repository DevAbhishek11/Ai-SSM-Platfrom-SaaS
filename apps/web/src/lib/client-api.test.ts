import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-error";
import { apiGet, apiPost, apiRequest } from "./client-api";

/**
 * `client-api` is the only place browser code touches the network, so these
 * specs pin the guarantees every panel now relies on: a CSRF header on writes,
 * a bounded wait, and a typed error whatever the failure mode.
 */

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });

const lastCall = (mock: ReturnType<typeof vi.fn>) => {
  const [url, init] = mock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
};

const setCookie = (value: string) => {
  vi.stubGlobal("document", { cookie: value });
};

const setLocation = () => {
  const assign = vi.fn();
  vi.stubGlobal("window", { location: { assign } });
  return assign;
};

describe("apiRequest", () => {
  beforeEach(() => {
    setCookie("ssm_csrf=csrf-token-value");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("issues a same-origin GET with no CSRF header", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiGet<{ ok: boolean }>("/health")).resolves.toEqual({ ok: true });

    const { url, init, headers } = lastCall(fetchMock);
    expect(url).toBe("/api/health");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("same-origin");
    expect(init.cache).toBe("no-store");
    expect(headers.has("x-csrf-token")).toBe(false);
  });

  it("attaches the CSRF token from the cookie on writes", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "1" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiPost("/posts", { title: "hello" });

    const { init, headers } = lastCall(fetchMock);
    expect(init.method).toBe("POST");
    expect(headers.get("x-csrf-token")).toBe("csrf-token-value");
    expect(headers.get("content-type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ title: "hello" }));
  });

  it("omits the CSRF header when no token cookie exists yet", async () => {
    setCookie("ssm_at=token");
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await apiPost("/posts", {});

    expect(lastCall(fetchMock).headers.has("x-csrf-token")).toBe(false);
  });

  it("normalises a leading-slash-free path", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("health/ready");

    expect(lastCall(fetchMock).url).toBe("/api/health/ready");
  });

  it("throws a typed ApiError carrying the envelope's field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            statusCode: 400,
            code: "validation_failed",
            message: "Request validation failed",
            fieldErrors: { brief: ["must be at least 10 characters"] }
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        )
      )
    );

    const error = await apiPost("/ai/generate", {}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("validation_failed");
    expect((error as ApiError).formErrors.brief).toMatch(/10 characters/);
  });

  it("redirects to the login screen when the session has ended", async () => {
    const assign = setLocation();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ code: "session_revoked", message: "Session has been revoked" }), {
          status: 401,
          headers: { "content-type": "application/json" }
        })
      )
    );

    await expect(apiGet("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(assign).toHaveBeenCalledWith("/login?reason=session-expired");
  });

  it("does not redirect on a 403, which the caller can still handle", async () => {
    const assign = setLocation();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ code: "forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" }
        })
      )
    );

    await expect(apiGet("/audit")).rejects.toMatchObject({ kind: "forbidden" });
    expect(assign).not.toHaveBeenCalled();
  });

  it("converts a network failure into a retryable ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));

    const error = (await apiGet("/health").catch((caught: unknown) => caught)) as ApiError;

    expect(error.kind).toBe("network");
    expect(error.retryable).toBe(true);
  });

  it("aborts a request that exceeds its timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("Timeout", "TimeoutError"))
            );
          })
      )
    );

    const error = (await apiRequest("/slow", { timeoutMs: 10 }).catch(
      (caught: unknown) => caught
    )) as ApiError;

    expect(error.kind).toBe("timeout");
  });

  it("returns undefined for an empty 204 response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));

    await expect(apiRequest("/posts/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("reports an unreadable success body instead of crashing the caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>not json</html>", { status: 200 }))
    );

    const error = (await apiGet("/dashboard").catch((caught: unknown) => caught)) as ApiError;

    expect(error.code).toBe("invalid_response");
  });
});
