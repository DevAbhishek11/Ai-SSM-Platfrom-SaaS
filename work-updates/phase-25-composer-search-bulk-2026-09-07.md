# Phase 25 — Composer, search, bulk operations (2026-09-07)

Request: make the product better and add as many features as possible, tested.

The gap that mattered: 29 API modules and 11 pages, but **no way to write a
post**. `posts` exposed only `GET` and `POST`, there was no way to read one
back, edit it, duplicate it or archive it, and no UI at all. Everything below
follows from closing that loop.

Full behaviour is documented in `docs/product/composer-and-search.md`.

## Shared domain logic

- `packages/domain/src/post-validation.ts` — per-network composing rules as
  data, imported by both tiers so the API's enforcement and the composer's live
  preview cannot drift. Covers character ceilings, X's fixed 23-character link
  cost, hashtag caps, media requirements, attachment limits, first-comment
  support, link clickability and schedule sanity. Grapheme-aware counting.
- `packages/domain/src/search.ts` — ranking shared by the API and the command
  palette, so client-side re-ranking cannot disagree with the server.
  - *Found by its own test*: the hashtag regex used `\p{L}\p{N}` and cut
    Devanagari words at the virama (`#उत्पाद` → `उत`). Combining marks
    (`\p{M}`) are now included.

## Posts API

`GET /posts/:id`, `PATCH /posts/:id`, `POST /posts/:id/duplicate`,
`DELETE /posts/:id`, `POST /posts/validate`, `GET /posts/platform-rules`, and a
`GET /posts` that filters by status, platform, campaign, free text and date
range with sorting, pagination and facet counts.

- **Optimistic concurrency**: `expectedUpdatedAt` turns a lost update into a
  409 with a message that tells the user to reload.
- Cross-workspace reads 404 rather than 403, so ids cannot be probed.
- Duplicates deliberately drop the publish slot, so two posts cannot race for
  the same time.
- An empty edit body is rejected, so a no-op cannot win a concurrency race.

**Drafts are allowed to be incomplete.** The first cut enforced the media
requirement at create time and immediately broke the template flow, which
generates text-only Instagram drafts. That was the code being wrong, not the
test: copy is written before the asset exists. The requirement now bites in
`WorkflowService.schedule()` — the last point before a publisher fails at 6am.

## Search

`GET /search` spans posts, campaigns, media, accounts, templates, people and
navigation targets, workspace-scoped before ranking. The command palette now
searches real data, debounced, discarding out-of-order responses, with the
navigation map always available locally so it still works with the API down.
Recent selections persist.

## Bulk operations and collaboration

`POST /workflow/posts/bulk` — one action across up to 50 posts, **reporting per
item**. Partial success is the normal case here; a single red banner would hide
which nine of twelve went through. Ids are de-duplicated; the cap stops one
request becoming unbounded work.

`POST /workflow/posts/:postId/comments` and `.../comments/:id/resolve` add
review comments that do not move the post.

## Web

- `/composer` — shared draft that forks per channel on edit, live per-platform
  counters and issue list, schedule picker, media attachment, save / send for
  review / duplicate / archive, and a `beforeunload` guard on unsaved work.
- `/posts` — content library on the new data table, with bulk actions.
- `components/ui/data-table.tsx` over pure helpers in `lib/table.ts`:
  numeric-aware sorting, empty values last in both directions, stable ties,
  page clamping, and **CSV injection neutralised** (`=`, `+`, `-`, `@` are
  quote-prefixed so an exported caption is not a formula in someone's Excel).
- `components/ui/toast.tsx` — errors persist, successes auto-dismiss.
- `lib/shortcuts.ts` + `ShortcutHelp` — chords and `g`-style sequences, never
  firing while the user is typing, with a `?` reference sheet. The shell now
  owns the global key handler; the topbar's ad-hoc ⌘K listener is gone.

## Testing

`178 → 362 tests` across 30 files.

| New suite | Tests |
| --- | --- |
| `packages/domain/src/post-validation.test.ts` | 20 |
| `packages/domain/src/search.test.ts` | 16 |
| `apps/api/test/posts.spec.ts` | 31 |
| `apps/api/test/search.spec.ts` | 12 |
| `apps/api/test/workflow-collaboration.spec.ts` | 15 |
| `apps/web/src/lib/composer.test.ts` | 26 |
| `apps/web/src/lib/table.test.ts` | 31 |
| `apps/web/src/lib/shortcuts.test.ts` | 32 |

`navigation.test.ts` now derives the owner's permissions from `rolePermissions`
instead of a hand-written list, so adding a nav entry cannot make it pass for
the wrong reason.

Gate: typecheck clean · 362 tests · eslint 0 problems · both builds OK (15 web
routes) · `npm audit` 0 vulnerabilities.

Live verification through the browser proxy: create 201, edit 200, stale edit
409, bulk returns per-item results, duplicate lands as a draft with no schedule,
archive 200, and a write without a CSRF token is still 403.

## Notes

- `npx tsc` inside a workspace installs a **decoy `tsc` package** that shadows
  the real compiler, and `npm uninstall` of it rewrites the lockfile. Use the
  root `npm run typecheck`.
- `GET /posts` now returns a paginated envelope rather than a bare array; the
  typechecker caught the one internal consumer (`dashboard.service.ts`), which
  moved to a new `listAll()`.

## Follow-ups

Unchanged: Drizzle-backed persistence, MFA/OIDC/SAML, password reset. New:
drag-and-drop rescheduling on the calendar, thread/carousel composing, AI
suggestions inline in the composer, and saved views for the content library.
