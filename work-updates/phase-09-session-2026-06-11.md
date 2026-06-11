# Phase 09 Session - 2026-06-11

## Scope

Turn static billing limits into enforceable entitlements: centralized projected checks, workflow gates, Settings usage visibility, docs, and validation.

## Decisions

- Keep the current demo workspace mapped to Business while enforcing checks through a shared billing service.
- Project increments before mutations so workflows fail before side effects are created.
- Gate member invitations, API key creation, social OAuth starts, AI generation, media upload intents, and post creation.
- Expose `/api/billing/entitlements/check` for admin tooling and support triage.
- Show usage and limits in Settings so admins can see why actions may be blocked.

## Execution Checklist

- [x] Add centralized entitlement capability checks.
- [x] Expose projected entitlement API endpoint.
- [x] Wire entitlement gates into members, API keys, social, AI, media, and posts.
- [x] Add Settings usage/limit visibility.
- [x] Update OpenAPI, architecture, runbooks, user docs, and changelog.
- [x] Validate typecheck, tests, lint, build, and audit gate.

## Validation Log

- `npm run typecheck`: passed.
- `npm run test`: passed; includes entitlement check endpoint coverage.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm audit --audit-level=high`: passed; moderate upstream advisories remain for nested `drizzle-kit/@esbuild-kit/esbuild` and Next-bundled `postcss`.

## Follow-Up Queue

- Replace fixture usage with persisted tenant usage counters.
- Add plan override and enterprise custom-limit administration.
- Add billing events/webhooks for plan upgrades, downgrades, and payment failures.
- Add usage alert thresholds and in-app notifications.
- Add hard/soft limit modes per capability.
