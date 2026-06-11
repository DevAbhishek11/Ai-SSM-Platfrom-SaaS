# AI Social Media Management Platform

Enterprise SaaS scaffold for an AI-native social media management platform inspired by Hootsuite, Buffer, Sprout Social, Later, and Agorapulse.

The root `prompt.md` is the product blueprint. Current implementation uses a TypeScript npm-workspaces monorepo:

- `apps/web` - Next.js App Router dashboard UI
- `apps/api` - NestJS API with security, OpenAPI, and modular service boundaries
- `packages/domain` - shared product constants, permissions, Zod schemas, and demo fixtures
- `packages/database` - Drizzle/PostgreSQL schema and SQL migrations
- `docs` - PRD, architecture, API, security, and operations artifacts
- `infra` - Docker, Kubernetes, Terraform, monitoring, and CI assets
- `work-updates` - phase/session progress tracking

## Quick Start

```powershell
npm install
npm run typecheck
npm run test
npm run build
```

Run the apps in separate terminals:

```powershell
npm run dev:api
npm run dev:web
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`
- OpenAPI docs: `http://localhost:4000/docs`

## Environment

Copy `.env.example` to `.env` and update values for your local services.
