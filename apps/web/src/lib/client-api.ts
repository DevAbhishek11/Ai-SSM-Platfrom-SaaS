"use client";

import { clientApiBaseUrl } from "./api";
import { ApiError, apiErrorFromResponse, apiErrorFromThrown } from "./api-error";
import { CSRF_HEADER, isSafeMethod, readCsrfCookie } from "./csrf";

/**
 * The single browser-side entry point to the API.
 *
 * Every panel used to hand-roll its own fetch, error parsing and (missing)
 * timeout. Routing them through here means one place decides how CSRF tokens
 * are attached, how long a request may hang, what an error looks like, and what
 * happens when the session has ended.
 */

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Milliseconds before the request is aborted. */
  timeoutMs?: number;
  headers?: Record<string, string>;
};

const DEFAULT_TIMEOUT_MS = 20_000;

/** Where the browser is sent when the API says the session is over. */
const SESSION_EXPIRED_URL = "/login?reason=session-expired";

const buildUrl = (path: string): string =>
  path.startsWith("http") ? path : `${clientApiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Combines the caller's abort signal with a timeout so a hung request can never
 * leave a spinner running forever.
 */
const withTimeout = (
  timeoutMs: number,
  signal?: AbortSignal
): { signal: AbortSignal; done: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timeout", "TimeoutError")), timeoutMs);

  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort, { once: true });

  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  };
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const { signal, done } = withTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, options.signal);

  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  // Double-submit: the proxy compares this against the ssm_csrf cookie.
  if (!isSafeMethod(method)) {
    const token = readCsrfCookie();
    if (token) {
      headers.set(CSRF_HEADER, token);
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
      signal
    });
  } catch (error) {
    throw apiErrorFromThrown(error);
  } finally {
    done();
  }

  if (!response.ok) {
    const apiError = await apiErrorFromResponse(response);

    // A dead session cannot be recovered by the caller: send the user to login
    // rather than letting every panel render its own "unauthorized" state.
    if (apiError.status === 401 && typeof window !== "undefined") {
      window.location.assign(SESSION_EXPIRED_URL);
    }

    throw apiError;
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError({
      message: "The server returned a response we could not read.",
      kind: "server",
      status: response.status,
      code: "invalid_response"
    });
  }
}

export const apiGet = <T>(path: string, options: Omit<ApiRequestOptions, "method" | "body"> = {}) =>
  apiRequest<T>(path, { ...options, method: "GET" });

export const apiPost = <T>(path: string, body?: unknown, options: ApiRequestOptions = {}) =>
  apiRequest<T>(path, { ...options, method: "POST", body });

export const apiPatch = <T>(path: string, body?: unknown, options: ApiRequestOptions = {}) =>
  apiRequest<T>(path, { ...options, method: "PATCH", body });

export const apiDelete = <T>(path: string, options: ApiRequestOptions = {}) =>
  apiRequest<T>(path, { ...options, method: "DELETE" });
