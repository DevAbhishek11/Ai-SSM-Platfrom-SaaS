# Phase 17 Session - 2026-06-11

## Scope

Add production-shaped content planning templates: reusable post structures, variable rendering, draft creation, Calendar template UI, database migration, docs, and validation.

## Decisions

- Treat templates as workspace-scoped content planning assets with category, status, platforms, body placeholders, default hashtags, and governance guidance.
- Render templates into real posts through `PostsService` so plan limits and platform character validation remain centralized.
- Audit template creation and template usage with `content.*` events.
- Keep local template state in memory while adding Drizzle table, relation metadata, RLS policy, and migration `0013_content_templates.sql`.
- Put template controls on Calendar because managers use them while planning campaign publishing work.

## Execution Checklist

- [x] Add content template domain constants, schema, and fixtures.
- [x] Add Drizzle schema, relations, and SQL migration for content templates.
- [x] Add Content API endpoints for listing, creating, and using templates.
- [x] Add Calendar content template UI.
- [x] Update OpenAPI, architecture, ERD, runbooks, user/admin docs, security docs, changelog, and work-update index.
- [x] Validate typecheck, tests, lint, build, and audit gate.

## Validation Log

- `npm run typecheck`: passed.
- `npm run test`: passed; includes content template create/use coverage.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm audit --audit-level=high`: passed; moderate upstream advisories remain for nested `drizzle-kit/@esbuild-kit/esbuild` and Next-bundled `postcss`.

## Follow-Up Queue

- Persist Content API reads/writes through Drizzle repositories.
- Add template archive/update/version endpoints.
- Add placeholder validation before template activation.
- Add template-to-brand-voice and template-to-safety-policy review workflows.
- Add usage analytics by campaign, platform, creator, and review outcome.
