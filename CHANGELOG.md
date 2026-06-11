# Changelog

## 0.1.0 - 2026-06-11

- Added npm-workspaces monorepo.
- Added shared domain package with roles, permissions, schemas, platform capabilities, and fixtures.
- Added Drizzle/PostgreSQL schema and initial SQL migration.
- Added NestJS API with health, dashboard, workspace, post, AI, analytics, and social modules.
- Added Next.js dashboard with metrics, calendar, AI studio panel, account health, approvals, trends, and analytics chart.
- Added Phase 1 product, architecture, API, security, and operations docs.
- Added Docker, Kubernetes, Terraform, monitoring, and CI scaffolding.
- Added Argon2/JWT auth endpoints, global RBAC permission guard, and database health wiring.
- Added campaigns, media, notifications, billing, and webhooks API modules.
- Added workflow routes for calendar, AI studio, approvals, analytics, accounts, media, and settings.
- Added publishing job contracts, database migration, API endpoints, deterministic connectors, retry policy, and `/publishing` UI.
- Added approval workflow contracts, comments, transition events, migration, API endpoints, and approvals timeline/actions UI.
- Added media processing job contracts, migration, API lifecycle endpoints, runbook, and media pipeline UI.
- Added social connector OAuth state, rate-limit, and connector event contracts, API lifecycle endpoints, accounts UI, runbooks, and tests.
- Added audit log domain contracts, audit API, security audit settings UI, and audit hooks for auth, workflow, social, media, publishing, and webhook actions.
- Added workspace invitations, team-member access controls, scoped API key lifecycle, database migration, settings UI, audit hooks, runbooks, and tests.
- Added `x-api-key` authentication, scoped service-account principals, permission-scope enforcement, CORS support, and tests for allowed/denied/revoked key behavior.
- Added centralized billing entitlement checks, projected entitlement API, plan-limit enforcement for core mutations, Settings usage visibility, runbooks, and tests.
- Added notification preferences, delivery attempt contracts, routing API, quiet-hour suppression, Settings routing UI, runbooks, and tests.
- Added brand voice domain contracts, management/evaluation API, AI generation integration, AI Studio profile UI, docs, and tests.
- Added social listening monitor, mention, and alert contracts, database migration, API lifecycle endpoints, Analytics command center UI, runbook, docs, and tests.
- Added campaign milestone, task, budget line, and report contracts, database migration, API operations, Calendar command center UI, runbook, docs, and tests.
- Added AI safety policy, content check, and moderation queue contracts, database migration, safety API, AI generation integration, AI Studio safety review UI, runbook, docs, and tests.
