# Phase 21 Session - 2026-09-07

## Scope

Replace the single deterministic AI path with a production-shaped, credential-driven model
router covering Ollama (self-hosted), Anthropic Claude, and OpenAI, with a guaranteed local
fallback. Fix the runtime and workspace-script defects found while validating the running
system end to end.

## Decisions

- Providers are activated by credential presence only: `OLLAMA_BASE_URL`, `ANTHROPIC_API_KEY`,
  `OPENAI_API_KEY`. No provider is hard-coded as "the" AI backend.
- Default `auto` priority is `ollama,anthropic,openai` (privacy/cost first), overridable with
  `AI_PROVIDER_PRIORITY`; `AI_PROVIDER=<provider>` pins one provider.
- The deterministic local composer is always the last candidate so generation never fails and
  the product works with zero credentials or in air-gapped deployments.
- Every provider speaks one structured JSON contract (`aiProviderCompletionSchema`), so parsing,
  safety, brand-voice scoring, and repair have exactly one code path.
- Model output is untrusted: fence/prose JSON extraction, Zod validation, unknown-platform
  filtering, duplicate removal, per-platform character clamping, hashtag normalization, and
  deterministic repair for any missing platform. A parse failure is treated as a provider
  failure and cascades to the next provider.
- Requests are time-boxed with `AbortController` (`AI_REQUEST_TIMEOUT_MS`) so one slow provider
  cannot stall the API.
- Credentials never leave the process. `GET /api/ai/providers` returns the credential *source*
  (env var name) and configuration state, never the value; a unit test asserts redaction.
- Safety evaluation now scores the brief *and* the generated variants in a single check, so
  remote-model output is moderated, not just the prompt.
- Generation logging captures provider, model, latency, tokens, estimated cost, fallback usage,
  routing attempts, and reviewer feedback (`thumbs_up`/`thumbs_down`/`edited`).

## Execution Checklist

- [x] Add AI provider constants, schemas (`AiRouterStatus`, `AiRouting`, `AiGenerationLog`,
      provider completion contract), and types to `@ssm/domain`.
- [x] Add `ai.config.ts` (env-driven runtime config) plus `AI_CONFIG` / `AI_FETCH` DI tokens.
- [x] Add provider adapters: `OllamaProvider`, `AnthropicProvider`, `OpenAiProvider`,
      `LocalProvider`, plus a shared deterministic composer and prompt builder.
- [x] Add `ModelRouterService` with candidate ordering, cascade, timing, attempt trace, and
      status/probe reporting.
- [x] Rewrite `AiService` to async routing with output repair, safety, brand voice, cost, and
      generation logging.
- [x] Add `GET /api/ai/providers`, `GET /api/ai/generations`, `POST /api/ai/generations/:id/feedback`.
- [x] Add migration `0017_ai_provider_routing.sql`, Drizzle enums/columns, and the
      `ai_provider_attempts` table with indexes and RLS.
- [x] Add AI Studio "Model routing" panel plus provider/latency/fallback badges in results.
- [x] Route browser API traffic through a same-origin `/api` Next.js rewrite; bind the API to
      `API_HOST`; add `CORS_ALLOWED_ORIGINS`.
- [x] Update OpenAPI, architecture, ERD, runbooks, security checklist, user/admin guides,
      README, `.env.example`, changelog, known issues, and the work-update index.
- [x] Add `apps/api/test/di-metadata.spec.ts` so a metadata-stripping transpiler fails the
      test suite instead of the running server.
- [x] Ship AI provider configuration through Docker Compose and the Kubernetes ConfigMap.
- [x] Validate typecheck, tests, lint, build, audit, and a live end-to-end run of API + web.

## Defects Found And Fixed

1. **API dev server returned 500 on every request (pre-existing).** `tsx`/esbuild does not emit
   `design:paramtypes`, so Nest instantiated every provider with no constructor arguments and
   `PermissionsGuard.reflector` was `undefined`. `npm run dev:api` now runs
   `tsc --watch` + `node --watch` (metadata is emitted by `tsc`), which was verified live against
   `/api/health`, `/api/ai/providers`, and `/api/ai/generate`.
2. **Root `typecheck`/`test`/`build` failed from a clean checkout (pre-existing).** `@ssm/database`
   was never built before `@ssm/api` typechecked against it. Added a `build:packages` step.
3. **The API container image was unbuildable.** `apps/api/Dockerfile` never copied or built
   `@ssm/database`, which `@ssm/api` imports. Both the install and build stages now include it,
   and the compose/Kubernetes configuration carries the AI routing environment.
4. **ESLint silently skipped type-aware linting for nine files.** They fell through to the
   typescript-eslint default project and tripped its file cap once a ninth spec was added.
   Each package now owns a tsconfig that includes its tests and config files, the API test
   suite is type-checked in CI, and the `allowDefaultProject` escape hatch is gone.
5. **Browser could not reach the API behind a proxy.** Client components hard-coded
   `http://localhost:4000/api`. They now use `clientApiBaseUrl` (same-origin `/api`) with a
   Next.js rewrite to `API_PROXY_TARGET`; server components use `serverApiBaseUrl`.

## Validation Log

- `npm run typecheck`: passed (domain, database, api, web).
- `npm run test`: passed - 56 tests / 9 files (domain 6, database 3, api 43, web 4).
- `npm run lint`: passed.
- `npm run build`: passed (packages, API tsc build, Next.js production build of 11 routes).
- `npm audit --audit-level=high`: passed - 0 vulnerabilities after upgrading `next` 16.3.4,
  `@nestjs/platform-express` 11.2.3, `@nestjs/swagger` 11.4.7, `concurrently` 10.0.5, the
  `esbuild`/`postcss` overrides, and dropping the unused `tsx` dev dependency.
- `npm ci` re-verified from the committed lockfile before the gate was re-run.
- Live run: mock OpenAI/Anthropic/Ollama HTTP server (`scripts/mock-ai-provider.mjs`) + API +
  Next.js dev server.
  - `GET /api/ai/providers?probe=true` reported all three providers configured and reachable.
  - `POST /api/ai/generate` selected `ollama/llama3.1` with a succeeded attempt trace.
  - `GET /api/ai/generations` returned the logged generation with latency and cost.
  - All nine dashboard routes returned 200 through the Next.js server, and `/ai-studio`
    rendered the live Model routing panel.

## Follow-Up Queue

- Persist AI generations and provider attempts through Drizzle repositories.
- Stream responses (SSE) for long generations and surface partial output in AI Studio.
- Add embeddings/RAG (pgvector) for brand-context retrieval before generation.
- Add per-workspace model policies (allowed providers, data-residency-aware routing) tied to the
  regional compliance profile.
- Replace static cost coefficients with live provider pricing and add budget alerts.
- Re-verify the routing cascade against real Ollama, Anthropic, and OpenAI endpoints; the
  sandbox run used the bundled mock provider.
- Apply migration `0017_ai_provider_routing.sql` against a live PostgreSQL instance (no
  database was available in the sandbox, so it is review-only).
- Add circuit breaking / short-term provider health caching so a hard-down provider is skipped
  instead of retried on every request.
