# Phase 24 — Session management, error handling and hardening (2026-09-07)

Request: "proper session management, each and every type of error handling, make
it completely secure, test each and every thing."

Full contract is documented in `docs/security/sessions-and-errors.md`; this log
records what changed and what it fixed.

## Session management (API)

- `SessionsService` rewritten around an explicit
  `active | unknown | revoked | expired | idle` state machine:
  - **Idle timeout** (`SESSION_IDLE_TIMEOUT_MINUTES`, default 720) with a window
    that slides on every authenticated request.
  - **Concurrency bound** (`SESSION_MAX_PER_USER`, default 10) evicting the
    least recently used session.
  - `rotate()` now returns a typed failure reason (`unknown`, `reuse_detected`,
    `expired`, `idle`) instead of `undefined`, so the audit trail can record why
    without the client learning the difference.
  - Token lookups compare digests with `timingSafeEqual` and reject anything
    without the `ssm_rt_` prefix, removing a timing oracle.
  - `revokeAllForUser` gained an `except` option; `listForUser` now reports
    `idleExpiresAt` alongside the absolute expiry.
- **Fixed: revocation was eventual, not immediate.** `verifyAccessToken` only
  checked `revokedAt` and accepted a `sid` that no longer existed. It now
  requires the session to be `active`, touches it, and maps each dead state to a
  distinct 401 code. Logout, a device revoke or an idle timeout takes effect on
  the very next request instead of up to 15 minutes later.
- New `LoginAttemptsService`: per-account lockout
  (`AUTH_MAX_FAILED_LOGINS` / `AUTH_LOCKOUT_MINUTES`) layered on top of the
  per-IP throttle, keyed by salted digest, surviving a correct password for the
  cooldown. This is what stops a distributed stuffing run that rotates IPs.
- `revokeSession` for an unknown or foreign session id now 404s with an
  identical message, so the endpoint cannot enumerate session ids.

## Error handling

- `AllExceptionsFilter` registered as `APP_FILTER`: one envelope
  (`statusCode`, `code`, `message`, `requestId`, `timestamp`, `path`,
  optional `fieldErrors` / `details` / `retryAfterSeconds`) for every failure,
  including throttler and Zod errors. A 5xx never carries an internal message or
  stack; stacks go to the log keyed by request id, and only outside production.
- `buildValidationPipe()` registered as `APP_PIPE` with an exception factory that
  flattens class-validator output into `fieldErrors`, so a form can highlight the
  offending inputs. Registering it in the module (not `main.ts`) means the tests
  exercise the same pipeline as production.
- `RequestTimeoutInterceptor` (`REQUEST_TIMEOUT_MS`) turns a hung handler into a
  clean 504 instead of a pinned connection.
- Web: `lib/api-error.ts` (`ApiError` with `kind`/`code`/`formErrors`/`retryable`,
  covering envelopes, non-JSON bodies, offline and aborts) and
  `lib/client-api.ts` (the single browser network entry point). All **15**
  hand-rolled `fetch` call sites across the panels now route through it, which
  is how they all gained CSRF headers, timeouts and 401 handling at once.
- Added `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` and a
  skeleton `app/loading.tsx`, plus a shared `ErrorState` component.
- Server-side loads are bounded by `API_SERVER_TIMEOUT_MS`.

## Security

- **CSRF (new defence).** Cookie credentials made `/api/*` on the web tier
  CSRF-able. Added double-submit (`ssm_csrf` cookie vs `x-csrf-token` header,
  constant-time compare) plus an `Origin`/host check on every unsafe method.
  The token is planted at login and topped up by the route-protection proxy.
- **Fixed: path traversal in the proxy.** `encodeURIComponent` does not escape
  dots, so `["..","..","admin"]` normalised to the API root and escaped the
  `/api` prefix. Segments that traverse are now rejected with 400. Found by the
  test written for it.
- Proxy hygiene: strips the browser `Cookie`, any caller-supplied
  `Authorization`, `x-api-key` and `x-forwarded-host` before forwarding; never
  relays upstream `Set-Cookie`; enforces `API_PROXY_MAX_BODY_BYTES` (413) and
  `API_PROXY_TIMEOUT_MS` (504, distinct from 502 unreachable).
- Headers: full CSP on both tiers (`default-src 'none'` on the JSON-only API),
  `X-Frame-Options: DENY`, `frameguard: deny`, COOP, Permissions-Policy, HSTS in
  production, `no-store` on `/api/*`, `x-powered-by` off, `trust proxy = 1`,
  bounded body parsers, graceful shutdown on SIGTERM/SIGINT.

## Testing

`84 tests / 14 files` → **`178 tests / 22 files`**.

| New suite | Tests |
| --- | --- |
| `apps/api/test/sessions.service.spec.ts` | 14 |
| `apps/api/test/login-attempts.service.spec.ts` | 6 |
| `apps/api/test/error-handling.spec.ts` | 12 |
| `apps/web/src/lib/csrf.test.ts` | 12 |
| `apps/web/src/lib/api-error.test.ts` | 12 |
| `apps/web/src/lib/client-api.test.ts` | 11 |
| `apps/web/src/app/api/[...path]/route.test.ts` | 17 |
| `apps/web/src/proxy.test.ts` | 10 |

Gate: typecheck clean · 178 tests passing · eslint 0 problems · API + web builds
OK · `npm audit` 0 vulnerabilities.

Live verification against the running stack: CSRF write without a token 403,
with a token 201, cross-origin 403; logout returns `session_revoked` on the very
next `/auth/me`; 404 and validation envelopes carry `requestId` and
`fieldErrors`; all nine authenticated routes 200; anonymous routes redirect.

## Notes

- `getEnv()` caches on first read and `AppModule` reads it during module
  evaluation, so a spec that needs different env values must set them in a
  module imported *before* `app.module.js` (see `test/env-lockout.ts`) - a
  statement in the spec body is hoisted below the imports and runs too late.
- Default parameters treat an explicitly passed `undefined` as "use the
  default"; a test that wants to omit a header must pass `null`.

## Follow-ups

Unchanged and still open: Drizzle-backed session/account persistence (the stores
are in-process), MFA/OIDC/SAML, password reset and invite acceptance,
tenant-scoped reads, `__Host-` cookie prefixes once deployment is HTTPS-only.
