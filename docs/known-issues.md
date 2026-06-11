# Known Issues

- API repositories currently use deterministic seed data; Drizzle-backed persistence is the next implementation step.
- Authentication and permission guards are designed but not fully enforced on endpoints yet.
- Publishing workers and real social OAuth connectors are not implemented.
- Media upload pipeline is not implemented.
- AI generation uses deterministic local templates until provider integrations are configured.
- Dashboard chart uses demo analytics until analytics endpoint snapshots are connected to the page.
- `npm audit --audit-level=high` passes, but npm reports moderate upstream advisories in nested `drizzle-kit`/`@esbuild-kit` and Next.js-bundled `postcss`; npm's suggested fixes are breaking forced downgrades, so these should be revisited when upstream packages publish patched dependency graphs.
