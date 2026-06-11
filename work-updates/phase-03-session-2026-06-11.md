# Phase 03 Session - 2026-06-11

## Scope

Add approval workflow enforcement: legal post status transitions, reviewer actions, comments, timeline events, shared post repository state, database migration contracts, docs, UI, and tests.

## Decisions

- Introduce shared in-memory repository providers as a stepping stone to Drizzle-backed repositories.
- Model comments and workflow events as separate durable tables rather than embedding them in posts.
- Make workflow transitions explicit and reject illegal state changes.
- Keep every transition audit-ready through actor id, from/to status, action, metadata, and optional comment.

## Execution Checklist

- [x] Add workflow event and post comment domain contracts and fixtures.
- [x] Add `post_comments` and `workflow_events` database migration and Drizzle schema.
- [x] Add shared posts repository provider.
- [x] Add workflow API endpoints for timeline, submit, approve, request changes, schedule, and cancel.
- [x] Add legal transition enforcement and workflow comments.
- [x] Add approvals UI timeline and action panel.
- [x] Update OpenAPI, PRD, ERD, and user docs.
- [x] Validate typecheck, tests, lint, build, and audit gate.

## Validation Log

- `npm run typecheck`: passed.
- `npm run test`: passed; includes workflow transition enforcement and timeline coverage.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm audit --audit-level=high`: passed; moderate upstream advisories remain as previously documented.

## Follow-Up Queue

- Replace in-memory workflow event/comment stores with Drizzle repositories.
- Add comment resolution endpoints and mention notifications.
- Add multi-reviewer approval chains and SLA timers.
- Emit notifications and webhooks from workflow transitions.
