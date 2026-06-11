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
- Review content templates before activation to prevent unsafe placeholders or off-brand approved copy from spreading.
- Validate schedule reservations against platform/account health before publishing windows.
- Sign outbound webhooks with timestamped HMAC.
- Record IP and user agent for security-relevant audit events.
- Emit audit records for auth, identity, reports, workflow, connector, media, publishing, and webhook recovery actions.
