# Authentication And Authorization Design

## Authentication

Supported flows:

- Email and password with Argon2id hashing.
- OAuth 2.0/OIDC providers: Google, Microsoft, GitHub.
- SAML 2.0 for enterprise SSO.
- MFA: TOTP first, WebAuthn/FIDO2 for enterprise.
- API service accounts with scoped access tokens and rotation.

## JWT Flow

1. User authenticates through password, OAuth, or SSO.
2. API issues short-lived access token and rotating refresh token.
3. Access token includes subject, organization id, active workspace id, role, permissions version, issuer, audience, and expiry.
4. Refresh token is stored hashed with device/session metadata.
5. Logout invalidates refresh token family.
6. Permission changes bump a membership permissions version and force refresh.

## RBAC Matrix

| Permission | Super Admin | Owner | Admin | Manager | Creator | Reviewer | Viewer | API |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Platform management | Yes | No | No | No | No | No | No | No |
| Billing management | Yes | Yes | No | No | No | No | No | No |
| Workspace settings | Yes | Yes | Yes | No | No | No | No | No |
| Onboarding/localization | Yes | Yes | Yes | No | No | No | No | No |
| Member management | Yes | Yes | Yes | No | No | No | No | No |
| API keys/webhooks | Yes | Yes | Yes | No | No | No | No | Yes |
| Enterprise identity | Yes | Yes | Yes | No | No | No | No | No |
| Campaign management | Yes | Yes | Yes | Yes | No | No | No | No |
| Create/edit posts | Yes | Yes | Yes | Yes | Yes | No | No | Yes |
| Manage content templates | Yes | Yes | Yes | Yes | Yes | No | No | No |
| Review posts | Yes | Yes | Yes | Yes | No | Yes | No | No |
| Publish posts | Yes | Yes | Yes | Yes | No | No | No | Yes |
| View analytics | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Export analytics | Yes | Yes | Yes | Yes | No | No | No | Yes |
| Manage social accounts | Yes | Yes | Yes | No | No | No | No | Yes |
| View audit logs | Yes | Yes | Yes | No | No | No | No | No |

## Authorization Layers

- Route-level permission guards.
- Workspace membership checks.
- Object ownership checks for posts, campaigns, media, and reports.
- Database RLS using active workspace context.
- Audit logging for permission-sensitive actions.
- `audit.view` gates `/api/audit/logs`, `/api/audit/summary`, `/api/audit/export`, and the Settings security audit panel.
- `members.invite`, `members.manage`, and `api_keys.manage` gate invitation, role, suspension, and service credential workflows.
- `workspace.manage` gates `/api/identity/sso-connections`, `/api/identity/sessions`, `/api/identity/devices`, and Settings identity security controls.
- `workspace.manage` gates `/api/onboarding/*`, `/api/localization/*`, Dashboard onboarding actions, and Settings localization/regional controls.
- `analytics.view` gates report lists; `analytics.export` gates report template, schedule, export, and share-link creation.
- `posts.create` gates `/api/content/templates` mutations and template usage.
- `posts.schedule` gates `/api/scheduling/rules`, `/api/scheduling/recommendations`, and slot reservation.
- API keys authenticate through `x-api-key` as `api_service_account` principals and can only use permissions included in their stored scopes.

## Security Controls

- Encrypt OAuth tokens and MFA secrets with envelope encryption.
- Enforce CSRF protection for cookie-based browser mutations.
- Use CORS allowlist and strict security headers.
- Rate-limit auth, AI, and publishing endpoints.
- Store all external webhook secrets hashed.
- Store invitation tokens and API key secrets only as hashes; raw API key secrets are returned once.
- Revoke API keys to immediately reject future `x-api-key` requests.
- Revoke sessions and trusted devices to terminate suspicious browser/device access.
- Store report share-link tokens hashed in production and enforce expiry/revocation before download.
- Audit onboarding, localization preference, and regional compliance profile changes for setup and regulatory evidence.
- Review content templates before activation to prevent unsafe placeholders or off-brand approved copy from spreading.
- Validate schedule reservations against platform/account health before publishing windows.
- Sign outbound webhooks with timestamped HMAC.
- Record IP and user agent for security-relevant audit events.
- Emit audit records for auth, identity, reports, workflow, connector, media, publishing, and webhook recovery actions.

## Implemented Build: Session Authentication

The current build implements the password + JWT portion of the design above.

### API surface

| Endpoint | Auth | Rate limit | Behaviour |
| --- | --- | --- | --- |
| `POST /auth/register` | public | 5/60s | Creates account + workspace, returns a session |
| `POST /auth/login` | public | 10/60s | Generic `Invalid email or password` on any failure |
| `POST /auth/refresh` | public | 30/60s | Rotates the refresh token; reuse revokes the whole family |
| `POST /auth/logout` | public | global | Revokes the presented refresh token |
| `GET /auth/me` | bearer | global | User, workspace, role, permissions, session id |
| `GET /auth/sessions` | bearer | global | Active sessions with IP, user agent, and `current` flag |
| `POST /auth/sessions/:id/revoke` | bearer | global | Owner-of-session check before revocation |
| `PATCH /auth/password` | bearer | 5/60s | Re-verifies the current password, then revokes every session |
| `PATCH /auth/profile` | bearer | global | Name, timezone, language |
| `POST /auth/switch-workspace` | bearer | global | Re-issues tokens for another membership |

### Token and cookie contract

- Access token: HS256 JWT with `{sub,email,name,role,workspaceId,sid}`, 15 minute TTL
  (`ACCESS_TOKEN_TTL_SECONDS`), verified against issuer and audience.
- Refresh token: opaque `ssm_rt_<base64url>` stored only as a SHA-256 digest, 30 day TTL
  (`REFRESH_TOKEN_TTL_DAYS`), rotated on every refresh, family revoked on replay.
- Browser cookies `ssm_at` and `ssm_rt` are `httpOnly`, `sameSite=lax`, `path=/`, and
  `secure` outside development, so client JavaScript can never read a usable credential.
- Failed logins are audited against a placeholder workspace id with an email fingerprint
  instead of the raw address.

### Guard order

`AppThrottlerGuard` -> `ApiKeyAuthGuard` -> `AuthenticationGuard` -> `PermissionsGuard`.

- `@Public()` routes skip authentication; a malformed bearer token on a public route is
  ignored rather than rejected.
- `x-api-key` callers become `api_service_account` principals limited to their stored scopes.
- `AUTH_ALLOW_DEV_HEADERS` (default `false`) gates the legacy `x-user-role` debug header.
  With it disabled, an unknown or spoofed role header cannot authenticate anything.

### Web session handling

- `apps/web/src/proxy.ts` protects every non-public route, refreshes an expiring session in
  place, and redirects to `/login?next=...&reason=session-expired` when the refresh fails.
- `apps/web/src/app/api/[...path]/route.ts` is the only path from the browser to the API. It
  injects the bearer token server-side, performs a single refresh-and-replay on 401, and
  clears both cookies when the refresh token is dead.
- Server components load data with `authorizedFetch()`, so RSC reads are scoped to the
  signed-in principal rather than an anonymous service identity.
- Settings exposes the user-facing half of this: profile, password rotation (which signs out
  every device), and per-session revocation.
