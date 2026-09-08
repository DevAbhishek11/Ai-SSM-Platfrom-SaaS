/**
 * Normalises everything the API can return on failure into one error type.
 *
 * The API answers with `{ statusCode, code, message, requestId, fieldErrors? }`,
 * but a request can also die before it ever reaches a handler - DNS, a proxy
 * 502, an aborted timeout - so callers need a single thing to catch.
 */

export type ErrorEnvelope = {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
  details?: unknown;
  retryAfterSeconds?: number;
};

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "rate_limited"
  | "server"
  | "unknown";

/** Copy shown to a user when the raw message is unusable or absent. */
const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  network: "Cannot reach the server. Check your connection and try again.",
  timeout: "The request took too long. Please try again.",
  unauthorized: "Your session has ended. Sign in again to continue.",
  forbidden: "You do not have permission to do that.",
  not_found: "That resource no longer exists.",
  validation: "Some of the details you entered need attention.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  server: "Something went wrong on our side. The team has been notified.",
  unknown: "Something went wrong. Please try again."
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(init: {
    message: string;
    kind: ApiErrorKind;
    status: number;
    code: string;
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
    retryAfterSeconds?: number;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors;
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  /** True when retrying the identical request could plausibly succeed. */
  get retryable(): boolean {
    return this.kind === "network" || this.kind === "timeout" || this.kind === "rate_limited" || this.status >= 500;
  }

  /** Flat `{ field: message }` map for wiring straight into a form. */
  get formErrors(): Record<string, string> {
    if (!this.fieldErrors) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(this.fieldErrors).map(([field, messages]) => [field, messages.join(". ")])
    );
  }
}

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "validation";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "unknown";
}

const readMessage = (envelope: ErrorEnvelope, kind: ApiErrorKind): string => {
  const raw = envelope.message;
  if (Array.isArray(raw)) {
    const joined = raw.filter((entry) => typeof entry === "string").join(". ");
    return joined || FALLBACK_MESSAGES[kind];
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw;
  }
  return FALLBACK_MESSAGES[kind];
};

/** Builds an ApiError from a failed `Response`, tolerating a non-JSON body. */
export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const kind = kindForStatus(response.status);

  let envelope: ErrorEnvelope = {};
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object") {
      envelope = parsed as ErrorEnvelope;
    }
  } catch {
    // An HTML error page or empty body: the status alone drives the message.
  }

  return new ApiError({
    message: readMessage(envelope, kind),
    kind,
    status: response.status,
    code: envelope.code ?? kind,
    fieldErrors: envelope.fieldErrors,
    requestId: envelope.requestId ?? response.headers.get("x-request-id") ?? undefined,
    retryAfterSeconds:
      envelope.retryAfterSeconds ??
      (response.headers.get("retry-after")
        ? Number(response.headers.get("retry-after"))
        : undefined)
  });
}

/** Wraps a thrown value from `fetch` (offline, DNS, abort) into an ApiError. */
export function apiErrorFromThrown(error: unknown): ApiError {
  const aborted =
    error instanceof DOMException
      ? error.name === "AbortError" || error.name === "TimeoutError"
      : error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");

  const kind: ApiErrorKind = aborted ? "timeout" : "network";

  return new ApiError({
    message: FALLBACK_MESSAGES[kind],
    kind,
    status: 0,
    code: kind
  });
}

/** Last-resort narrowing for `catch` blocks that may see anything. */
export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : apiErrorFromThrown(error);
}

/** Safe message for display: never surfaces an internal string verbatim. */
export function friendlyMessage(error: unknown): string {
  const apiError = toApiError(error);
  return apiError.status >= 500 ? FALLBACK_MESSAGES.server : apiError.message;
}
