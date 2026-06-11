# Phase 07 Session - 2026-06-11

## Scope

Add admin access-management workflows: workspace invitations, team-member role/suspension controls, scoped API keys, database migration, settings UI, audit hooks, docs, and validation.

## Decisions

- Model invitations separately from team members so pending/revoked/expired access can be audited before user acceptance.
- Store invitation tokens and API key secrets only as hashes; raw API key secrets are returned once at creation.
- Keep API key responses sanitized so `secretHash` never leaves the API.
- Reuse existing RBAC permissions: `members.invite`, `members.manage`, and `api_keys.manage`.
- Surface team access in Settings alongside billing, webhooks, and security audit.

## Execution Checklist

- [x] Add invitation and API-key domain contracts and fixtures.
- [x] Add Drizzle schema and migration for `workspace_invitations` and `api_keys`.
- [x] Add member invitation/role/suspend API endpoints.
- [x] Add API key create/list/revoke endpoints.
- [x] Add Settings team access UI.
- [x] Update OpenAPI, architecture, runbooks, user/security docs, and changelog.
- [x] Validate typecheck, tests, lint, build, and audit gate.

## Validation Log

- `npm run typecheck`: passed.
- `npm run test`: passed; includes member invitation lifecycle, API key creation/revocation, and secret-hash response sanitization.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm audit --audit-level=high`: passed; moderate upstream advisories remain for nested `drizzle-kit/@esbuild-kit/esbuild` and Next-bundled `postcss`.

## Follow-Up Queue

- Add invitation acceptance flow with email delivery and user provisioning.
- Add API key authentication guard and scope enforcement for service accounts.
- Add member search, pagination, and role-change confirmation UI.
- Add API key last-used updates from request authentication.
- Add SCIM provisioning for enterprise tenants.
