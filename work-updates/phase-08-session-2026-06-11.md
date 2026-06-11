# Phase 08 Session - 2026-06-11

## Scope

Make scoped API keys usable for service authentication: `x-api-key` verification, service-account principal creation, scoped permission enforcement, guard registration, tests, docs, and validation.

## Decisions

- Authenticate API keys with a global guard before the RBAC permission guard.
- Continue storing only hashed API-key secrets; verification hashes the incoming `x-api-key` value.
- Treat valid keys as `api_service_account` principals with permissions limited to the key's stored scopes.
- Tighten permission checks so principals must have both role eligibility and the specific scoped permission.
- Reject revoked or expired keys before route handlers execute.

## Execution Checklist

- [x] Add API-key secret verification and last-used update.
- [x] Add global `x-api-key` auth guard.
- [x] Enforce scoped principal permissions in the RBAC guard.
- [x] Add tests for allowed scoped access, denied missing scope, and revoked-key rejection.
- [x] Update OpenAPI security scheme, architecture, admin/security docs, and changelog.
- [x] Validate typecheck, tests, lint, build, and audit gate.

## Validation Log

- `npm run typecheck`: passed.
- `npm run test`: passed; includes scoped API-key allow, missing-scope deny, and revoked-key rejection coverage.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm audit --audit-level=high`: passed; moderate upstream advisories remain for nested `drizzle-kit/@esbuild-kit/esbuild` and Next-bundled `postcss`.

## Follow-Up Queue

- Add key-prefix lookup optimization for large key sets.
- Add API-key request rate limits and per-key usage analytics.
- Add partial secret fingerprint display for admin confirmation.
- Add service-account request-id and IP/user-agent capture in audit events.
- Add key rotation workflow with overlap windows.
