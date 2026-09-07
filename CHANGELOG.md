# Changelog

## 0.2.0 - 2026-09-07

- Added a multi-provider AI model router: Ollama (self-hosted), Anthropic Claude, and OpenAI
  activate from the credentials present, with a deterministic local composer as the guaranteed
  fallback and automatic cascade on error, timeout, or unusable output.
- Added `AI_PROVIDER`, `AI_PROVIDER_PRIORITY`, `AI_REQUEST_TIMEOUT_MS`, `AI_MAX_OUTPUT_TOKENS`,
  `AI_TEMPERATURE`, and per-provider base URL/model/version configuration.
- Added `GET /api/ai/providers` (configuration + optional reachability probe, never returns
  credentials), `GET /api/ai/generations`, and `POST /api/ai/generations/:id/feedback`.
- Added routing metadata (`provider`, `providerModel`, `routing.attempts`, latency, fallback)
  to AI generation responses and the generation audit log with token and cost attribution.
- Hardened model output handling: JSON fence/prose extraction, Zod validation, platform
  filtering, per-platform character clamping, hashtag normalization, and deterministic repair.
- Extended AI safety evaluation to cover generated variants in addition to the brief.
- Added `0017_ai_provider_routing.sql`, Drizzle provider/routing columns, and the
  `ai_provider_attempts` table with RLS.
- Added the AI Studio "Model routing" panel and provider badges on generated results.
- Fixed the API dev server: `tsx` does not emit decorator metadata, so every injected
  dependency (including `Reflector` in the permissions guard) was undefined and all requests
  returned 500. `npm run dev:api` now runs the `tsc --watch` + `node --watch` pipeline.
- Fixed root `typecheck`/`test`/`build` scripts to build `@ssm/database` before dependents.
- Routed browser API calls through a same-origin `/api` Next.js rewrite (`API_PROXY_TARGET`)
  so the dashboard works behind reverse proxies and preview environments, bound the API to
  `API_HOST` (default `0.0.0.0`), and added `CORS_ALLOWED_ORIGINS`.
- Added 33 new tests covering provider selection, cascade/fallback, timeouts, credential
  redaction, output repair, generation logging, feedback, and decorator-metadata emission
  (56 tests total across the four workspaces).
- Added `scripts/mock-ai-provider.mjs`, a local OpenAI/Anthropic/Ollama HTTP mock for
  end-to-end routing verification without real credentials.
- Fixed ESLint type-aware coverage: test files, `next.config.ts`, and `drizzle.config.ts`
  now belong to real TypeScript projects instead of the default-project fallback, and the
  API test suite is type-checked by `npm run typecheck`.
- Fixed the API container image, which never installed or built `@ssm/database`; added the
  AI routing environment to `docker-compose.yml` and the Kubernetes ConfigMap, and wired the
  web container to the same-origin `/api` proxy.
- Upgraded `next` to 16.3.4, `@nestjs/platform-express` to 11.2.3, `@nestjs/swagger` to
  11.4.7, `concurrently` to 10.0.5, and the `esbuild`/`postcss` overrides; removed the unused
  `tsx` dev dependency. `npm audit` now reports zero vulnerabilities.

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
- Added reporting templates, scheduled reports, export generation, share-link contracts, database migration, Reports API, Analytics reporting UI, runbook, docs, and tests.
- Added enterprise identity controls for SSO connections, auth sessions, trusted devices, database migration, Identity API, Settings security UI, runbook, docs, and tests.
- Added reusable content template contracts, database migration, Content API, Calendar template UI, runbook, docs, and tests.
- Added smart scheduling rule/slot contracts, database migration, Scheduling API, Calendar recommendation UI, runbook, docs, and tests.
- Added onboarding checklist contracts, database migration, Onboarding API, Dashboard activation UI, runbook, docs, and tests.
- Added localization preferences and regional compliance profile contracts, database migration, Localization API, Settings localization UI, runbook, docs, and tests.
