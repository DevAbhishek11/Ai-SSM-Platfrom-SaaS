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
| Campaign management | Yes | Yes | Yes | Yes | No | No | No | No |
| Create/edit posts | Yes | Yes | Yes | Yes | Yes | No | No | Yes |
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

## Security Controls

- Encrypt OAuth tokens and MFA secrets with envelope encryption.
- Enforce CSRF protection for cookie-based browser mutations.
- Use CORS allowlist and strict security headers.
- Rate-limit auth, AI, and publishing endpoints.
- Store all external webhook secrets hashed.
- Sign outbound webhooks with timestamped HMAC.
- Record IP and user agent for security-relevant audit events.
