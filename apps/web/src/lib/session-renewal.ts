/**
 * Session renewal helpers shared by the route-protection proxy and the API
 * proxy route.
 *
 * These are the two places that can trade a refresh token for a new access
 * token, and a browser routinely triggers both at once: the access cookie
 * lapses, then a link prefetch, the navigation it belongs to, and three panel
 * fetches all discover it in the same tick. Without coordination that is four
 * rotations of a single-use token, which looks exactly like a replay attack.
 */

/** In-flight renewals, keyed by the token being exchanged. */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Collapses concurrent calls for the same key onto one execution.
 *
 * Callers that arrive while a call is running receive the same promise rather
 * than starting their own, so five parallel requests produce one refresh and
 * one set of cookies. The entry is dropped as soon as it settles: this is a
 * de-duplicator, not a cache, and a stale token must never be handed out.
 */
export function singleFlight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = run();
  inFlight.set(key, promise);

  const release = () => {
    // Guard against clearing a newer entry if this one settled late.
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  };
  promise.then(release, release);

  return promise;
}

/** Test seam; also used to drop state when a session ends. */
export function resetSingleFlight(): void {
  inFlight.clear();
}

/**
 * Reads the `exp` claim from a JWT **without verifying it**.
 *
 * The API is the only authority on whether a token is valid — this is purely a
 * hint used to decide whether renewing is worth a round trip. A forged claim
 * can therefore only cause an unnecessary refresh, never an authorisation
 * decision.
 */
export function readTokenExpiry(token: string | undefined): number | undefined {
  if (!token) {
    return undefined;
  }

  const payload = token.split(".")[1];
  if (!payload) {
    return undefined;
  }

  try {
    const normalised = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), "=");
    const decoded = JSON.parse(
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8")
    ) as { exp?: unknown };

    return typeof decoded.exp === "number" && Number.isFinite(decoded.exp)
      ? decoded.exp * 1000
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Number of milliseconds before expiry at which a token is already considered
 * spent.
 *
 * The access cookie is set to lapse slightly before the token inside it, but
 * clocks drift and a request takes time to arrive. Renewing a little early
 * costs one cheap call; renewing a little late costs the user their session,
 * because the page render that discovers the 401 cannot set cookies.
 */
export const RENEWAL_SKEW_MS = 60_000;

/**
 * Whether the proxy should exchange the refresh token before serving this
 * request.
 *
 * A missing token obviously needs renewal. So does one that cannot be parsed:
 * something is wrong with it, and a refresh is the cheaper way to find out than
 * a redirect to the login screen.
 */
export function accessTokenNeedsRenewal(
  accessToken: string | undefined,
  now: number = Date.now(),
  skewMs: number = RENEWAL_SKEW_MS
): boolean {
  if (!accessToken) {
    return true;
  }

  const expiresAt = readTokenExpiry(accessToken);
  if (expiresAt === undefined) {
    return true;
  }

  return expiresAt - skewMs <= now;
}

export type RenewalOutcome =
  | { status: "renewed"; accessToken: string; refreshToken: string; expiresIn: number }
  /** The API answered and said no. The session really is over. */
  | { status: "rejected" }
  /** The API could not be reached. Says nothing about the session. */
  | { status: "unreachable" };

/**
 * Exchanges a refresh token, distinguishing "the API rejected this" from "the
 * API did not answer".
 *
 * Collapsing those two into one failure is how a thirty-second API blip turns
 * into every signed-in user being logged out and having their refresh cookie
 * deleted — a self-inflicted outage on top of the original one.
 */
export async function renewSession(
  apiOrigin: string,
  refreshToken: string,
  timeoutMs = 10_000
): Promise<RenewalOutcome> {
  return singleFlight(refreshToken, async () => {
    let response: Response;
    try {
      response = await fetch(`${apiOrigin}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch {
      return { status: "unreachable" } as const;
    }

    if (response.status >= 500) {
      // The service is broken, not the credential.
      return { status: "unreachable" } as const;
    }

    if (!response.ok) {
      return { status: "rejected" } as const;
    }

    try {
      const body = (await response.json()) as {
        accessToken?: unknown;
        refreshToken?: unknown;
        expiresIn?: unknown;
      };

      if (typeof body.accessToken !== "string" || typeof body.refreshToken !== "string") {
        return { status: "unreachable" } as const;
      }

      return {
        status: "renewed",
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        expiresIn: typeof body.expiresIn === "number" ? body.expiresIn : 900
      } as const;
    } catch {
      return { status: "unreachable" } as const;
    }
  });
}
