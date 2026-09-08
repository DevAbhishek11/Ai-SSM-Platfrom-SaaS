# Phase 23 — Dashboard UI redesign & CSS verification (2026-09-07)

## Context

Reported symptom: "css is not working" plus a request to make the dashboard look far more
professional.

## CSS investigation

No breakage was found in the pipeline. Verified against both dev and production servers:

- `apps/web/postcss.config.mjs` loads a single `@tailwindcss/postcss` plugin (Tailwind v4, no
  config file) — correct for this setup.
- The emitted stylesheet is served with `200 / text/css` (41 KB minified in production, 60 KB in
  dev) and contains every layer: base tokens, component primitives, and the responsive variants
  (`@media (min-width: 40rem | 48rem | 64rem | 80rem | 96rem)`, `hover:hover`,
  `prefers-reduced-motion`).
- Earlier greps that suggested missing variants were false negatives: production CSS is minified to
  a single line and class names are escaped (`.xl\:grid-cols-2`), so line-oriented `grep -c`
  under-reports. Use `grep -o … | wc -l` with the escaped form.

Most likely cause of the report: a browser tab left open across a `next dev` restart. Turbopack
mints new chunk hashes on restart, so the stale tab keeps requesting dead
`/_next/static/chunks/*.css` URLs, 404s, and renders unstyled. The preview is now served from a
production build (`next build` + `next start`), which has stable content-hashed asset URLs. A hard
refresh clears the stale state.

## Design system (`apps/web/src/app/globals.css`)

Rewritten as an explicit token layer plus component primitives, all theme-aware through
`:root` / `[data-theme="dark"]`:

- **Tokens** — canvas/panel/panel-soft/border/muted, indigo→violet `--accent*` with
  `--accent-gradient`, semantic `--success|--warning|--danger|--info` each with `-soft` and
  `-border` companions, sidebar tokens (`--sidebar-accent|-active|-border`), chart tokens
  (`--chart-1..4`, `--chart-grid`, `--chart-axis`), a radius scale, and a four-step shadow scale
  (`--shadow-xs|-sm|-raised|-pop`).
- **Primitives** — `.card` / `.card-interactive` / `.card-header` / `.card-title` /
  `.card-subtitle` / `.surface-hero` / `.hairline`, `.field`, `.btn-primary|-secondary|-ghost|
  -danger` + `.btn-sm`, `.kbd`, `.badge` (+ `-success|-warning|-danger|-info|-accent|-plain`),
  `.chip`, `.stat-value`, `.tabular`, `.eyebrow`, `.data-table`, `.progress`, `.sidebar-link`
  (active rail via `[data-active="true"]::before`), `.skip-link`, `.scroll-thin`, `.animate-in`,
  `.pulse-ring`, and a `prefers-reduced-motion` block.

Every `var(--…)` referenced anywhere under `apps/web/src` resolves to a defined token (verified by
diffing used vs. declared custom properties).

## Component work

- **Shell** — sidebar on a gradient surface with a gradient `SSM` brand tile and rail-marked active
  links; topbar with a wider `Search or jump to… ⌘K` trigger, `.pulse-ring` unread badge, animated
  dropdown; content and footer capped at `max-w-[1600px]`.
- **Dashboard (`app/page.tsx`)** — restructured into a hero band (active campaign, objectives, and a
  four-stat pulse grid), an onboarding checklist, four KPI cards with inline sparklines, a
  severity-toned alerts grid, then calendar + AI studio + account health, analytics + approvals, and
  publishing + trends.
- **`metric-card.tsx`** — trend chip (up / down / flat) with matching iconography, optional inline
  SVG sparkline, icon tile.
- **`analytics-chart.tsx`** — `useChartPalette()` reads resolved chart tokens via `getComputedStyle`
  and re-reads them from a `MutationObserver` on `data-theme`, so charts recolour with the theme.
  Custom tooltip, gradient area fills, capitalized axis ticks via `tickFormatter`.
- **Widgets** — `calendar-board`, `approval-queue`, `account-health`, `trend-list`, and
  `ai-studio-panel` rebuilt on the shared card header language, with real links replacing dead
  buttons, empty states, platform chips, and progress meters.
- **Consistency pass** — 33 files migrated from ad-hoc `rounded-lg border … shadow-sm` stacks to
  `card p-4`; the last hardcoded Tailwind palette colours (`red-*`, `amber-*`, `emerald-*`) replaced
  with semantic tokens so dark mode no longer breaks on those panels; the session table now uses
  `.data-table`.
- **Page headers** — every route (`/analytics`, `/approvals`, `/accounts`, `/calendar`,
  `/publishing`, `/media`, `/ai-studio`, `/settings`) now passes contextual `actions` into the
  shell header.
- **Auth layout** — gradient marketing panel, gradient brand tile, tokenised highlight icons.

## Validation

| Gate | Result |
| --- | --- |
| `npm run typecheck` | clean (domain, database, api, api tests, web) |
| `npm test` | 84 passed / 14 files (domain 6, database 3, api 57, web 18) |
| `npm run lint` | 0 problems |
| `npm run build` | API `tsc` + web `next build` OK, 13 routes |
| `npm audit` | 0 vulnerabilities |
| Smoke (prod server) | `/`, `/analytics`, `/ai-studio`, `/settings`, `/calendar`, `/approvals`, `/media`, `/publishing`, `/accounts` → 200; `/login`, `/register` → 307 when already authenticated |
| Asset check | page 200, CSS 200 `text/css` 41 KB, first JS chunk 200 |

## Notes for next session

- Recharts rejects `var(--token)` strings and the `tick.textTransform` prop; keep resolving colours
  through `getComputedStyle` and capitalizing via `tickFormatter`.
- `next start` prints a warning under `output: "standalone"`; it still serves correctly, but the
  canonical production command is `node .next/standalone/server.js`.
- Playwright/Chromium still cannot be installed in this sandbox — UI verification stays curl-based.
