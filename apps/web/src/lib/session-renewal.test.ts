import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accessTokenNeedsRenewal,
  readTokenExpiry,
  renewSession,
  resetSingleFlight,
  singleFlight
} from "./session-renewal";

const jwtWithExp = (expSeconds: number | undefined): string => {
  const payload = expSeconds === undefined ? {} : { exp: expSeconds, sub: "user" };
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
};

afterEach(() => {
  resetSingleFlight();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("singleFlight", () => {
  it("runs one call for concurrent callers with the same key", async () => {
    // Five panels discovering an expired cookie at once must produce one
    // rotation, not five.
    let calls = 0;
    const run = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return calls;
    };

    const results = await Promise.all([
      singleFlight("k", run),
      singleFlight("k", run),
      singleFlight("k", run)
    ]);

    expect(calls).toBe(1);
    expect(results).toEqual([1, 1, 1]);
  });

  it("keeps different keys independent", async () => {
    let calls = 0;
    const run = async () => {
      calls += 1;
      return calls;
    };

    await Promise.all([singleFlight("a", run), singleFlight("b", run)]);

    expect(calls).toBe(2);
  });

  it("does not cache: a later call runs again", async () => {
    // A de-duplicator, not a cache. Handing out a spent token would be worse
    // than an extra round trip.
    let calls = 0;
    const run = async () => {
      calls += 1;
      return calls;
    };

    await singleFlight("k", run);
    await singleFlight("k", run);

    expect(calls).toBe(2);
  });

  it("shares a rejection with every waiter and then clears", async () => {
    const failing = async () => {
      throw new Error("nope");
    };

    const [first, second] = await Promise.allSettled([
      singleFlight("k", failing),
      singleFlight("k", failing)
    ]);

    expect(first.status).toBe("rejected");
    expect(second.status).toBe("rejected");

    let ranAgain = false;
    await singleFlight("k", async () => {
      ranAgain = true;
    });
    expect(ranAgain).toBe(true);
  });
});

describe("readTokenExpiry", () => {
  it("reads the exp claim in milliseconds", () => {
    expect(readTokenExpiry(jwtWithExp(1_800_000_000))).toBe(1_800_000_000_000);
  });

  it("returns undefined for a token with no exp", () => {
    expect(readTokenExpiry(jwtWithExp(undefined))).toBeUndefined();
  });

  it("returns undefined rather than throwing on rubbish", () => {
    expect(readTokenExpiry("not-a-jwt")).toBeUndefined();
    expect(readTokenExpiry("a.b.c")).toBeUndefined();
    expect(readTokenExpiry("")).toBeUndefined();
    expect(readTokenExpiry(undefined)).toBeUndefined();
  });

  it("handles base64url payloads that need padding", () => {
    const token = jwtWithExp(1_700_000_001);
    expect(readTokenExpiry(token)).toBe(1_700_000_001_000);
  });
});

describe("accessTokenNeedsRenewal", () => {
  const now = 1_700_000_000_000;

  it("renews when there is no token at all", () => {
    expect(accessTokenNeedsRenewal(undefined, now)).toBe(true);
  });

  it("leaves a comfortably valid token alone", () => {
    expect(accessTokenNeedsRenewal(jwtWithExp(now / 1000 + 600), now)).toBe(false);
  });

  it("renews a token that has already expired", () => {
    expect(accessTokenNeedsRenewal(jwtWithExp(now / 1000 - 1), now)).toBe(true);
  });

  it("renews just before expiry rather than just after", () => {
    // The render that discovers a 401 cannot set cookies, so being early is
    // cheap and being late costs the session.
    expect(accessTokenNeedsRenewal(jwtWithExp(now / 1000 + 30), now)).toBe(true);
    expect(accessTokenNeedsRenewal(jwtWithExp(now / 1000 + 90), now)).toBe(false);
  });

  it("renews an unparseable token instead of trusting it", () => {
    expect(accessTokenNeedsRenewal("garbage", now)).toBe(true);
  });

  it("honours a custom skew", () => {
    expect(accessTokenNeedsRenewal(jwtWithExp(now / 1000 + 30), now, 0)).toBe(false);
  });
});

describe("renewSession", () => {
  const ORIGIN = "http://api.test/api";

  const stubFetch = (impl: (...args: unknown[]) => unknown) => {
    const spy = vi.fn(impl);
    vi.stubGlobal("fetch", spy);
    return spy;
  };

  it("returns the new pair on success", async () => {
    stubFetch(async () =>
      new Response(
        JSON.stringify({ accessToken: "at", refreshToken: "rt", expiresIn: 900 }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    await expect(renewSession(ORIGIN, "old")).resolves.toEqual({
      status: "renewed",
      accessToken: "at",
      refreshToken: "rt",
      expiresIn: 900
    });
  });

  it("reports a 401 as rejected: the session really is over", async () => {
    stubFetch(async () => new Response("{}", { status: 401 }));

    await expect(renewSession(ORIGIN, "old")).resolves.toEqual({ status: "rejected" });
  });

  it("reports a network failure as unreachable, not as a dead session", async () => {
    // Treating a blip as a logout deletes the refresh cookie and turns a
    // thirty-second API outage into a mass sign-out.
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(renewSession(ORIGIN, "old")).resolves.toEqual({ status: "unreachable" });
  });

  it("treats a 500 as unreachable: the service is broken, not the credential", async () => {
    stubFetch(async () => new Response("boom", { status: 500 }));

    await expect(renewSession(ORIGIN, "old")).resolves.toEqual({ status: "unreachable" });
  });

  it("treats a malformed success body as unreachable", async () => {
    stubFetch(async () => new Response("not json", { status: 200 }));

    await expect(renewSession(ORIGIN, "old")).resolves.toEqual({ status: "unreachable" });
  });

  it("collapses concurrent renewals of the same token into one call", async () => {
    const spy = stubFetch(
      async () =>
        new Response(JSON.stringify({ accessToken: "at", refreshToken: "rt", expiresIn: 900 }), {
          status: 200
        })
    );

    const [a, b, c] = await Promise.all([
      renewSession(ORIGIN, "same"),
      renewSession(ORIGIN, "same"),
      renewSession(ORIGIN, "same")
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("does not collapse renewals of different tokens", async () => {
    const spy = stubFetch(
      async () =>
        new Response(JSON.stringify({ accessToken: "at", refreshToken: "rt", expiresIn: 900 }), {
          status: 200
        })
    );

    await Promise.all([renewSession(ORIGIN, "one"), renewSession(ORIGIN, "two")]);

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
