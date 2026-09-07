# Phase 22 Session - 2026-09-07

## Scope

Replace header-based role impersonation with a real authentication system, and rebuild the web
dashboard around it: sign-in/sign-up, cookie-backed sessions, protected routing, an
authenticated browser-to-API proxy, and a professional application shell (permission-aware
sidebar, workspace switcher, notifications, command palette, theming) plus user-facing account
security controls.

## Decisions

- **Credentials never reach client JavaScript.** Access and refresh tokens live in `httpOnly`
  cookies (`ssm_at`, `ssm_rt`). Nothing is written to `localStorage`, so an XSS bug cannot
  exfiltrate a usable credential.
- **One path from the browser to the API.** `apps/web/src/app/api/[...path]/route.ts` is an
  authenticated same-origin proxy: it attaches the bearer token server-side, refreshes once on a
  401, replays the buffered request, and clears cookies when the refresh token is dead. The old
  `next.config.ts` rewrite was removed - it bypassed authentication and is now dead config.
- **Server components authenticate too.** `getDashboardOverview()` and `getAiRouterStatus()`
  moved from anonymous `serverApiBaseUrl` fetches to `authorizedFetch()`, so RSC reads run as
  the signed-in principal. Both keep their fixture fallback so the UI still renders when the API
  is down.
- **`getSession()` is wrapped in React `cache()`**, so a layout and its page share one `/auth/me`
  round trip per request.
- **Refresh-token rotation with replay detection** stays server-side: reuse of a rotated token
  revokes the whole family. Password changes revoke every session and force a fresh sign-in.
- **`AUTH_ALLOW_DEV_HEADERS` defaults to `false`.** The legacy `x-user-role` header is ignored,
  and all 15 client components that were sending it were cleaned up - the API now derives the
  role from the session, so the UI cannot suggest its own privileges.
- **Next.js 16 `proxy.ts` convention.** `middleware.ts` is deprecated in this version; the file
  was renamed and the exported function is now `proxy()`.
- **`typedRoutes` stays on.** `NavItem.href` is typed as `Route`, and the two genuinely dynamic
  redirects narrow through a validated `safeNextPath()` helper instead of disabling type-safe
  routing.
- **Timestamps render in a fixed zone** (`NEXT_PUBLIC_DISPLAY_TIMEZONE`, default `UTC`). Locale
  formatting without an explicit zone was producing React hydration mismatches on every page
  with a date.
- **One password policy, one module.** `src/lib/password-rules.ts` is shared by the register
  form, the change-password form, and both server actions. (A `"use server"` file may only
  export async functions, so the rules cannot live there.)

## Execution Checklist

- [x] API: `/auth/register|login|refresh|logout|me|session|sessions|sessions/:id/revoke`,
      `PATCH /auth/password|profile`, `POST /auth/switch-workspace` with Argon2id hashing,
      HS256 access tokens, hashed rotating refresh tokens, and audit records.
- [x] API: per-route rate limits (register 5/60s, login 10/60s, refresh 30/60s, password 5/60s)
      on top of the 120/60s global limit.
- [x] Web: `src/lib/session.ts` (cookie helpers, `getSession`, `authorizedFetch`), `proxy.ts`
      route protection with silent refresh, and the authenticated `/api/[...path]` proxy.
- [x] Web: `(auth)` route group - split-screen marketing layout, login form with demo-credential
      card and `next` redirect support, register form with a live password-strength meter.
- [x] Web: application shell - `app-shell.tsx` (session guard + notification load),
      `shell-frame.tsx`, `sidebar-nav.tsx` (collapsible, permission-filtered, mobile drawer),
      `topbar.tsx` (breadcrumb, search, bell, theme, user menu), `workspace-switcher.tsx`,
      `command-palette.tsx` (`Cmd/Ctrl+K`), `theme-toggle.tsx`.
- [x] Web: design tokens rewritten with a full dark theme, pre-paint theme script, skip link,
      and shared `.field` / `.btn-*` / `.card` primitives.
- [x] Web: all nine dashboard pages migrated to the new shell props (`activePath`, `title`,
      `description`); the old `components/app-shell.tsx` deleted.
- [x] Web: Settings "Your account" panel - profile form, password rotation, and active-session
      list with per-session revocation, all through server actions.
- [x] Fixed the recharts `width(-1)/height(-1)` warning and the `formatTime` hydration mismatch.
- [x] Docs: README authentication section, `docs/security/authz-rbac.md` implemented-build
      section, user guide sign-in/navigation sections, `.env.example` auth block.

## Defects Found And Fixed

1. **RSC loaders would have 401'd under the new guards.** They still used anonymous fetches
   against `serverApiBaseUrl`; both now use `authorizedFetch()`.
2. **A `/api/:path*` rewrite in `next.config.ts` bypassed the authenticated proxy.** Removed.
3. **Hydration mismatch on every timestamp.** `Intl.DateTimeFormat` without a `timeZone`
   rendered server time on the server and local time in the browser.
4. **`"use server"` cannot export objects.** Exporting the password-rule array from
   `account-actions.ts` crashed `/settings` with a 500 at module evaluation.
5. **Dead `x-user-role` headers in 15 client components** implied client-side role selection
   that the API no longer honours.
6. **Unused test helpers** (`patch`/`put`/`del`) tripped type-aware lint once the auth specs
   landed.

## Validation Log

- `npm run typecheck`: passed (domain, database, api, web - including `apps/api/test`).
- `npm run test`: passed - 84 tests / 14 files (domain 6, database 3, api 57, web 18).
- `npm run lint`: passed (0 errors, 0 warnings).
- `npm run build`: passed - packages, API `tsc` build, Next.js production build of 13 routes.
- `npm audit`: 0 vulnerabilities (also with `--omit=dev`).
- Live run: mock AI provider (`scripts/mock-ai-provider.mjs 8788`) + API + Next.js dev server.
  - `GET /` anonymous -> `307` to `/login`; `/login` -> `200`.
  - All nine dashboard routes -> `200` with a session cookie.
  - `GET /api/notifications` -> `200` with cookies, `401` without.
  - `GET /api/auth/sessions` -> current session with IP, user agent, and `current: true`.
  - `/api/auth/me` with only the refresh cookie -> `200` plus rotated `Set-Cookie` pair
    (silent refresh through the proxy).
  - Replayed (already-rotated) refresh token -> `401` and both cookies cleared.
  - `POST /api/ai/generate` through the authenticated proxy -> `ollama/llama3.1`,
    `fallbackUsed: false`, 38 ms.
  - `/settings` renders the live "Active sessions" table and password form.

## Follow-Up Queue

- Persist accounts, sessions, and refresh tokens through Drizzle repositories (the repository
  seam exists; storage is in-memory because the sandbox has no PostgreSQL).
- Add MFA (TOTP), OAuth/OIDC sign-in, and SAML SSO to the implemented auth flows.
- Add CSRF double-submit protection for cookie-based mutations once non-`SameSite=lax` clients
  are supported.
- Password reset by email, and an invitation-accept flow that binds a new account to an
  existing workspace instead of creating one.
- Registration currently creates a fresh workspace id while dashboards still render `@ssm/domain`
  fixtures; wire tenant-scoped reads once persistence lands.
- Carry the phase-21 queue forward (streaming, RAG, live pricing, per-tenant model policies,
  migration `0017`).
