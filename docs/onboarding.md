# Developer Onboarding

## Prerequisites

- Node.js 22 or newer.
- npm 10 or newer.
- Docker Desktop for local PostgreSQL and Redis.

## First Day

1. Read `prompt.md`.
2. Read `docs/product/prd.md`.
3. Run `npm install`.
4. Run `npm run typecheck` and `npm run test`.
5. Start API and web locally.
6. Review `work-updates/implementation-roadmap.md`.

## Coding Standards

- Keep shared domain contracts in `packages/domain`.
- Keep database schema in `packages/database`.
- Add tests proportional to risk.
- Update `work-updates` when completing a phase or making a major architecture decision.
