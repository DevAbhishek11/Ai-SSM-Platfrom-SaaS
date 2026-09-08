/**
 * Double-submit CSRF token shared by the browser and the API proxy.
 *
 * Session credentials live in httpOnly cookies, which the browser attaches to
 * *any* same-site request - including one triggered by another origin. The
 * proxy therefore also demands a header that only same-origin JavaScript can
 * read, and that header has to match the cookie. This module holds the pieces
 * both sides need; it deliberately imports nothing server-only so it can be
 * bundled for the client.
 */

export const CSRF_COOKIE = "ssm_csrf";
export const CSRF_HEADER = "x-csrf-token";

/** Methods that cannot change state and therefore need no token. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const isSafeMethod = (method: string): boolean => SAFE_METHODS.has(method.toUpperCase());

/** 32 bytes of CSPRNG output, hex encoded. Works in Node and in the browser. */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Length-checked, branch-free comparison. Overkill for a value the client
 * already knows, but it costs nothing and keeps the pattern honest.
 */
export function timingSafeEquals(a: string | undefined, b: string | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0 || a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

/** Reads the token the server planted, for echoing back in the header. */
export function readCsrfCookie(cookieHeader: string | undefined = undefined): string | undefined {
  const source =
    cookieHeader ?? (typeof document === "undefined" ? undefined : document.cookie);
  if (!source) {
    return undefined;
  }

  for (const part of source.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CSRF_COOKIE) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return undefined;
}

/**
 * Origin allowlist check used alongside the token.
 *
 * `Origin` is set by the browser on every cross-site state-changing request and
 * cannot be forged by page script, so matching it against the host the request
 * actually arrived on is a strong second signal.
 */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) {
    // Same-origin GETs and some legacy clients omit Origin entirely; the token
    // check still applies, so this is not a bypass on its own.
    return true;
  }
  if (!host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
