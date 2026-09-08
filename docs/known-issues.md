# Known Issues

- API repositories currently use deterministic seed data; Drizzle-backed persistence is the next implementation step.
- Authentication and permission guards are designed but not fully enforced on endpoints yet.
- Publishing workers and real social OAuth connectors are not implemented.
- Media upload pipeline is not implemented.
- AI generation routes to Ollama, Anthropic Claude, or OpenAI based on the credentials present, and uses deterministic local templates when no provider is configured or every provider fails.
- AI generation logs and provider attempts are kept in memory; the `ai_generations` / `ai_provider_attempts` tables exist but Drizzle-backed persistence is still pending.
- Provider cost attribution uses static blended per-1K-token rates instead of live provider pricing.
- Streaming responses, embeddings/RAG, and per-tenant model policies are not implemented yet.
- Dashboard chart uses demo analytics until analytics endpoint snapshots are connected to the page.
- `npm audit --audit-level=high` passes, but npm reports moderate upstream advisories in nested `drizzle-kit`/`@esbuild-kit` and Next.js-bundled `postcss`; npm's suggested fixes are breaking forced downgrades, so these should be revisited when upstream packages publish patched dependency graphs.
