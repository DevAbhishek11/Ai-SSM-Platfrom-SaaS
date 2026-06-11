# Phase 20 Session - 2026-06-11

## Scope

Add production-shaped internationalization and regional compliance controls: localization preferences, regional compliance profile, Settings UI, database migration, docs, and validation.

## Decisions

- Store localization preferences per workspace/user with locale, direction, timezone, date/time formats, week start, numbering system, and translation enablement.
- Store one regional compliance profile per workspace with data residency, primary region, regulations, consent requirement, retention days, and cross-border transfer policy.
- Auto-select RTL direction when Arabic is selected unless an explicit direction is provided.
- Audit localization preference and regional compliance profile changes with `localization.*` events.
- Keep local localization/compliance state in memory while adding Drizzle tables, relation metadata, RLS policies, and migration `0016_localization_compliance.sql`.

## Execution Checklist

- [x] Add localization and regional compliance domain constants, schemas, and fixtures.
- [x] Add Drizzle schema, relations, and SQL migration for localization and compliance.
- [x] Add Localization API endpoints for capabilities, preferences, and compliance profile.
- [x] Add Settings localization and region UI.
- [x] Update OpenAPI, architecture, ERD, runbooks, user/admin docs, security docs, changelog, and work-update index.
- [x] Validate typecheck, tests, lint, build, and audit gate.

## Validation Log

- `npm run typecheck`: passed.
- `npm run test`: passed; includes localization preference and compliance profile update coverage.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm audit --audit-level=high`: passed; moderate upstream advisories remain for nested `drizzle-kit/@esbuild-kit/esbuild` and Next-bundled `postcss`.

## Follow-Up Queue

- Persist Localization API reads/writes through Drizzle repositories.
- Connect locale preferences to Next.js route/message loading and RTL document attributes.
- Connect regional compliance profile to storage residency, consent capture, retention, and export workers.
- Add localized message bundles for supported languages.
- Add compliance profile approval workflow for enterprise contracts.
