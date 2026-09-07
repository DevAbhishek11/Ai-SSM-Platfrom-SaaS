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
npm run lint
npm run build
npm audit --audit-level=high
```

Run the apps in separate terminals:

```powershell
npm run dev:api
npm run dev:web
```

`npm run dev:api` compiles with `tsc --watch` and reloads `dist/main.js` with
`node --watch`. This is deliberate: NestJS dependency injection relies on
`emitDecoratorMetadata`, which esbuild-based runners such as `tsx` strip, leaving every
injected dependency undefined at runtime. Do not swap the API dev pipeline for a
transpiler that cannot emit decorator metadata; `apps/api/test/di-metadata.spec.ts`
guards this.

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`
- OpenAPI docs: `http://localhost:4000/docs`

Demo auth:

- Email: `owner@acmegrowth.test`
- Password: `demo-password-change-me`

Implemented dashboard routes:

- `/` - command dashboard
- `/calendar` - calendar and campaign portfolio
- `/publishing` - publishing queue, idempotency, and retry visibility
- `/ai-studio` - AI generation workflow
- `/approvals` - review queue and notifications
- `/analytics` - performance dashboard
- `/accounts` - social account health
- `/media` - media library
- `/settings` - billing limits and webhook delivery status

The AI Studio page shows a live "Model routing" panel with the active provider chain.

## AI model routing

AI generation is provider-agnostic. The model router activates providers from the
credentials present in the environment and always keeps a working fallback:

| Order | Provider | Activated by | Default model |
| ----- | -------- | ------------ | ------------- |
| 1 | Ollama (self-hosted) | `OLLAMA_BASE_URL` | `llama3.1` |
| 2 | Anthropic Claude | `ANTHROPIC_API_KEY` | `claude-3-5-sonnet-latest` |
| 3 | OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Fallback | Local deterministic composer | always available | `local-deterministic-v1` |

- `AI_PROVIDER=auto` (default) walks the chain in `AI_PROVIDER_PRIORITY` order and
  skips providers with no credentials.
- `AI_PROVIDER=openai|anthropic|ollama|local` pins a single provider (it still falls
  back to the local composer if that provider is unconfigured or failing).
- Any provider error, timeout, or unusable response cascades to the next provider and
  is reported in the response `routing.attempts` array.
- Model output is untrusted: it is JSON-validated, clamped to per-platform character
  limits, stripped of unknown platforms, repaired for missing platforms, and then run
  through the safety and brand-voice checks.

Endpoints:

- `POST /api/ai/generate` - generate variants (returns provider, model, and routing trace)
- `GET /api/ai/providers?probe=true` - provider configuration and reachability (never returns keys)
- `GET /api/ai/generations` - generation audit log with cost, latency, and routing metadata
- `POST /api/ai/generations/:id/feedback` - thumbs up/down feedback loop

Local self-hosted setup:

```bash
ollama serve
ollama pull llama3.1
export OLLAMA_BASE_URL=http://localhost:11434
```

No credentials at all is a supported configuration: the router falls back to the local
deterministic composer, so the product stays fully usable offline.

To exercise the OpenAI, Anthropic, and Ollama HTTP contracts without real keys or a GPU,
run the bundled mock provider and point every provider at it:

```bash
node scripts/mock-ai-provider.mjs 8788

OLLAMA_BASE_URL=http://localhost:8788 \
ANTHROPIC_API_KEY=sk-ant-mock ANTHROPIC_BASE_URL=http://localhost:8788 \
OPENAI_API_KEY=sk-mock OPENAI_BASE_URL=http://localhost:8788 \
npm run dev:api
```

## Environment

Copy `.env.example` to `.env` and update values for your local services.

The browser talks to the API through the same-origin `/api` path, which the Next.js
dev/production server proxies to `API_PROXY_TARGET`. Server components use
`API_INTERNAL_URL`. This keeps the dashboard working behind reverse proxies and in
container/preview environments.
