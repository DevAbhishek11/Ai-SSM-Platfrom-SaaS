# Session Management, Error Handling And Hardening

How the implemented system behaves today. `authz-rbac.md` describes the target
design; this document is the contract the code and its tests actually enforce.

---

## 1. Session lifecycle

### Credentials

| Token | Form | Lifetime | Storage |
| --- | --- | --- | --- |
| Access token | JWT HS256, claims `{sub, email, name, role, workspaceId, sid}` | `ACCESS_TOKEN_TTL_SECONDS` (default 900s) | httpOnly cookie `ssm_at` |
| Refresh token | Opaque `ssm_rt_<base64url32>` | `REFRESH_TOKEN_TTL_DAYS` (default 30d) | httpOnly cookie `ssm_rt`, SHA-256 digest at rest |
| CSRF token | 32 random bytes, hex | 30d | readable cookie `ssm_csrf` (deliberately not httpOnly) |

Only digests of refresh tokens are retained, and lookups compare them with
`timingSafeEqual`, so the session store is neither replayable nor a timing
oracle.

### Three independent ways a session ends

1. **Absolute expiry** — `REFRESH_TOKEN_TTL_DAYS` from issue. Not extendable.
2. **Idle expiry** — `SESSION_IDLE_TIMEOUT_MINUTES` (default 720) since the last
   authenticated request. Every verified access token slides this window
   forward, so an active user is never interrupted while an abandoned session on
   a shared machine dies on schedule.
3. **Explicit revocation** — logout, revoking a device from settings, changing
   the password (revokes all), refresh-token reuse (revokes the family), or
   eviction past `SESSION_MAX_PER_USER` (default 10, least-recently-used first).

`SessionsService.validate()` returns exactly one of
`active | unknown | revoked | expired | idle`, and that value is what the API
turns into an error code.

### Revocation is immediate, not eventual

An access token is self-contained, so a naive implementation keeps working for
up to 15 minutes after logout. Every authenticated request therefore re-checks
the `sid` claim against the session store; a session that is not `active`
produces a 401 straight away. This is covered by
`apps/api/test/error-handling.spec.ts` ("invalidates the access token the moment
the session is revoked").

### Rotation and reuse detection

Refresh tokens are single-use. Rotation issues a new token in the same *family*.
Presenting a token that was already rotated is the signature of theft, so the
entire family is revoked and every device belonging to that login is signed out.

---

## 2. Brute-force defence

Two independent layers, because they stop different attacks:

| Layer | Scope | Limit | Response |
| --- | --- | --- | --- |
| `AppThrottlerGuard` | per IP + route | login 10/60s, register 5/60s, refresh 30/60s, password change 5/60s, global 120/60s | 429 `rate_limited` |
| `LoginAttemptsService` | per account | `AUTH_MAX_FAILED_LOGINS` (default 10) within 30 minutes | 429 `account_locked` + `Retry-After` |

The account lock survives a *correct* password for `AUTH_LOCKOUT_MINUTES`, which
is the point: a distributed credential-stuffing run cannot escape it by rotating
source IPs. Identities are stored as salted digests, never plaintext addresses.

Every failed sign-in returns the same message ("Invalid email or password") and
spends the same Argon2 budget regardless of whether the address exists, so the
endpoint is not a user-enumeration oracle.

---

## 3. Error contract

### The envelope

Every non-2xx response from the API has the same shape:

```json
{
  "statusCode": 400,
  "code": "validation_failed",
  "message": "email must be an email. password must be longer than or equal to 10 characters",
  "requestId": "c38306f2-199b-4f79-8e40-c13c95f44fdd",
  "timestamp": "2026-09-07T08:10:37.082Z",
  "path": "/api/auth/register",
  "fieldErrors": { "email": ["email must be an email"] }
}
```

- `code` is stable and safe to branch on; `message` is human-facing and may be
  reworded.
- `requestId` matches the `x-request-id` response header, so a user-reported
  failure maps to a log line.
- `fieldErrors` is present on validation failures and maps directly onto a form.

### Codes

| Code | Status | Meaning |
| --- | --- | --- |
| `validation_failed` | 400 | Body failed validation, or carried an unknown property |
| `invalid_credentials` | 401 | Wrong email or password |
| `invalid_token` | 401 | Malformed, tampered or expired access token |
| `session_revoked` / `session_idle` / `session_expired` | 401 | The session behind a valid JWT is gone |
| `forbidden` | 403 | Authenticated but not permitted |
| `csrf_origin_mismatch` / `csrf_token_invalid` | 403 | Rejected by the web proxy's CSRF check |
| `not_found` | 404 | Unknown route or resource |
| `payload_too_large` | 413 | Body over the proxy or parser limit |
| `rate_limited` / `account_locked` | 429 | Throttled by IP or locked by account |
| `internal_error` | 500 | Unhandled; message is always generic |
| `upstream_unreachable` / `upstream_timeout` | 502 / 504 | The web proxy could not reach the API |
| `request_timeout` | 504 | Handler exceeded `REQUEST_TIMEOUT_MS` |

### Guarantees

- A 5xx **never** carries an internal message, a stack trace, or a `details`
  payload. Stacks go to the log, keyed by request id, and only outside
  production.
- Unknown exceptions are caught by `AllExceptionsFilter`; there is no code path
  that returns an unshaped error.
- Long-running handlers are cut off by `RequestTimeoutInterceptor` rather than
  holding a connection open indefinitely.

### Web tier

- `src/lib/api-error.ts` normalises the envelope, a non-JSON body, an offline
  network and an aborted timeout into one `ApiError` with `kind`, `code`,
  `formErrors` and `retryable`.
- `src/lib/client-api.ts` is the only place browser code touches the network: it
  attaches the CSRF header, bounds every request with a timeout, and on a 401
  sends the user to `/login?reason=session-expired` instead of leaving each
  panel to invent its own dead-session state.
- `app/error.tsx`, `app/global-error.tsx` and `app/not-found.tsx` keep a crash
  inside a styled boundary; the thrown error is never rendered, only its
  `digest`.
- Server-side loads (`getSession`, `authorizedFetch`) are bounded by
  `API_SERVER_TIMEOUT_MS` so a wedged API cannot hang an SSR render.

---

## 4. CSRF

Session credentials are cookies, and a browser attaches cookies to cross-site
requests, so `/api/*` on the web tier - the only place a cookie is exchanged for
a bearer token - is the CSRF boundary.

Two checks run on every unsafe method (`POST`, `PATCH`, `PUT`, `DELETE`):

1. **Origin** must resolve to the same host the request arrived on.
2. **Double submit**: the `x-csrf-token` header must equal the `ssm_csrf` cookie.

The token is planted at login and topped up by the route-protection proxy on any
authenticated navigation, so a session predating this defence still works. Reads
are exempt (they cannot change state), and a request with no session cookie is
passed through so the API can answer with its own 401.

Server Actions are protected separately by Next.js' own `Origin` check, which is
why preview hosts must be listed in `experimental.serverActions.allowedOrigins`.

---

## 5. Transport and header hardening

**API** (helmet): CSP `default-src 'none'` (it only ever returns JSON),
`frame-ancestors 'none'`, `frameguard: deny`, `X-Content-Type-Options: nosniff`,
strict referrer policy, HSTS in production only, `x-powered-by` disabled,
`trust proxy = 1` so rate limiting and audit records see the real client IP.

**Web**: CSP restricted to `'self'` (plus the inline theme bootstrap),
`X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`,
`Permissions-Policy` denying camera/microphone/geolocation, HSTS in production,
and `Cache-Control: no-store` on `/api/*` so authenticated JSON is never held by
a shared cache.

**Proxy hygiene**: the browser's `Cookie`, any caller-supplied `Authorization`,
`x-api-key` and `x-forwarded-host` headers are stripped before forwarding;
upstream `Set-Cookie` is never relayed back; path segments that could traverse
out of the `/api` prefix are rejected with 400; bodies over
`API_PROXY_MAX_BODY_BYTES` are rejected with 413.

---

## 6. Configuration

| Variable | Default | Effect |
| --- | --- | --- |
| `ACCESS_TOKEN_TTL_SECONDS` | 900 | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | 30 | Absolute session lifetime |
| `SESSION_IDLE_TIMEOUT_MINUTES` | 720 | Inactivity window |
| `SESSION_MAX_PER_USER` | 10 | Concurrent sessions before LRU eviction |
| `AUTH_MAX_FAILED_LOGINS` | 10 | Failures before an account locks |
| `AUTH_LOCKOUT_MINUTES` | 15 | Lock duration |
| `REQUEST_TIMEOUT_MS` | 30000 | Handler ceiling before 504 |
| `REQUEST_BODY_LIMIT` | 1mb | API body parser limit |
| `API_PROXY_TIMEOUT_MS` | 30000 | Web proxy upstream ceiling |
| `API_PROXY_MAX_BODY_BYTES` | 2097152 | Web proxy body limit |
| `API_SERVER_TIMEOUT_MS` | 10000 | SSR fetch ceiling |

---

## 7. Test coverage

| Suite | What it pins |
| --- | --- |
| `apps/api/test/sessions.service.spec.ts` | Rotation, reuse detection, idle expiry, sliding window, absolute expiry, LRU eviction, per-user scoping, listing |
| `apps/api/test/login-attempts.service.spec.ts` | Lock threshold, cooldown, window expiry, reset on success, identity normalisation |
| `apps/api/test/error-handling.spec.ts` | Envelope shape, request-id echo, field errors, unknown-property rejection, error codes, no stack leakage, immediate revocation, sibling revocation, session-id non-enumeration, lockout + `Retry-After`, refresh replay |
| `apps/api/test/auth.spec.ts` | Full auth lifecycle under strict (production-equivalent) settings |
| `apps/web/src/lib/csrf.test.ts` | Token generation, constant-time compare, cookie parsing, origin matching |
| `apps/web/src/lib/api-error.test.ts` | Status mapping, envelope parsing, non-JSON bodies, timeout vs network, 5xx message suppression |
| `apps/web/src/lib/client-api.test.ts` | CSRF header attachment, timeout abort, 401 redirect, typed errors, empty and unreadable bodies |
| `apps/web/src/app/api/[...path]/route.test.ts` | CSRF acceptance and rejection, header stripping, 502/504/413, refresh-and-replay, cookie rotation, path traversal |
| `apps/web/src/proxy.test.ts` | Route protection, return paths, CSRF top-up, silent renewal, expired-session redirect |

---

## 8. Known gaps

Deliberate, and tracked rather than hidden:

- Sessions and accounts are in-process maps. They survive neither a restart nor
  a second replica; the Drizzle-backed store is the next step and every mutation
  already funnels through one service to make that a single-file change.
- MFA (TOTP/WebAuthn), OIDC and SAML are designed but not implemented.
- No password-reset or invitation-acceptance flow yet.
- Cookies do not use the `__Host-` prefix; adding it requires the deployment to
  be HTTPS-only, so it is a production-hardening step rather than a default.
