# Composing, Searching And Bulk Operations

The platform had 29 API modules but no way to write a post. This document
covers the features that close that loop, plus the cross-cutting UX work that
came with them.

---

## 1. The composer

`/composer` — one shared draft, forked per network on demand.

### Shared copy with per-channel forks

Most posts say the same thing everywhere, so the composer starts with a single
editor that mirrors into every selected channel. The moment a channel's text is
edited it **forks**: it stops tracking the shared draft and shows a `forked`
badge. Editing the shared copy after that never silently discards the tailored
version, and a one-click reset re-joins it.

Typing a forked tab back to exactly the shared text un-forks it again, so the
state cannot drift into "forked but identical".

### Validation that mirrors the network

`packages/domain/src/post-validation.ts` holds the rules as data, and both tiers
import it: the API enforces them, the composer previews them live. They cannot
drift apart because there is only one copy.

Beyond the character ceiling it knows:

| Rule | Why it exists |
| --- | --- |
| Link cost | X rewrites every URL to a fixed 23-character `t.co` link. Counting raw length tells the user they are over the limit when they are not. |
| Media requirement | Instagram, TikTok, YouTube and Pinterest cannot publish text alone. |
| Hashtag caps | A hard cap per network, plus a soft warning before the spam heuristics bite. |
| First-comment support | Not every network can deliver one; posting anyway silently drops it. |
| Link clickability | Instagram and TikTok render URLs as plain text. |
| Attachment limits | Four on X, ten on Instagram, one on TikTok. |
| Schedule sanity | In the past is an error; under five minutes out is a warning, because it leaves no room for approval. |

Errors block; warnings inform. Character counting is grapheme-aware, so an emoji
costs one character rather than two.

### Drafts are allowed to be incomplete

A draft can be missing its image — the copy is usually written before the asset
exists, and refusing to save that would make the composer useless. The media
requirement is enforced at the point the post is **scheduled**, which is the last
moment a missing image can be caught before the publisher fails at 6am. This is
pinned by tests on both sides of the boundary.

### Concurrent editing

`PATCH /posts/:id` accepts an `expectedUpdatedAt` token. If the post changed
since the client read it, the write is rejected with `409` and a message telling
the user to reload — rather than silently overwriting a colleague's edit. The
composer surfaces that as a distinct toast.

An empty edit body is rejected too, so a no-op cannot bump `updatedAt` and win a
race against a real change.

### Unsaved-work guard

A dirty draft registers a `beforeunload` handler. Losing a post to a stray tab
close is the most expensive mistake a composer can allow, so it gets a
browser-level guard rather than an apology afterwards.

---

## 2. Post lifecycle API

| Endpoint | Purpose |
| --- | --- |
| `GET /posts` | Filter by status, platform, campaign, free text and date range; sortable, paginated, with facet counts over the filtered set |
| `GET /posts/:id` | One post; a post in another workspace reports 404, not 403, so ids cannot be probed |
| `GET /posts/platform-rules` | Static limits, so counters keep working offline |
| `POST /posts` | Create, validated against every selected network |
| `POST /posts/validate` | Preflight; returns errors, warnings and a per-platform summary without storing anything |
| `PATCH /posts/:id` | Partial edit with optional optimistic concurrency |
| `POST /posts/:id/duplicate` | Copy back to draft — deliberately **without** the publish slot, so two posts cannot race for the same time |
| `DELETE /posts/:id` | Archive; content is retained because audit and analytics reference it. Idempotent |

Pagination clamps a page past the end rather than returning an empty table, and
caps `pageSize` so one caller cannot ask for everything.

---

## 3. Cross-entity search

`GET /search?q=&kinds=&limit=` spans posts, campaigns, media, accounts,
templates, people and navigation targets. Every source is workspace-scoped
*before* ranking, so a hit is never returned for something the caller cannot
open.

Ranking lives in `packages/domain/src/search.ts` and is shared with the browser.
Tiers, strongest first: exact → prefix → word-start → substring → fuzzy
subsequence. Ties break by kind, then recency. Matching is accent- and
case-insensitive, and a query containing regex metacharacters is treated as
text, not a pattern.

### Command palette

`⌘K` searches real data. Because the client re-ranks with the same function the
server uses, the list does not reshuffle when a slower response lands. Requests
are debounced, out-of-order responses are discarded, and the navigation map is
always searchable locally so the palette still works with the API down. Recent
selections persist per browser.

---

## 4. Bulk operations

`POST /workflow/posts/bulk` applies one action (`submit`, `approve`,
`request_changes`, `cancel`, `archive`) to up to 50 posts.

**Partial success is the normal case** — a reviewer selects a dozen posts and two
of them moved on since the list rendered. Each id therefore reports its own
outcome, and a failure on one never rolls back the rest:

```json
{
  "action": "submit",
  "requested": 12, "succeeded": 10, "failed": 2,
  "results": [{ "postId": "…", "ok": true, "status": "in_review" },
              { "postId": "…", "ok": false, "error": "Cannot transition post from approved to in_review" }]
}
```

Repeated ids are de-duplicated so an action applies once. The batch is capped
because an unbounded list turns one request into unbounded work.

---

## 5. Collaboration

- `POST /workflow/posts/:postId/comments` — a review comment that does **not**
  move the post, recorded on the timeline as a `commented` event.
- `POST /workflow/posts/comments/:commentId/resolve` — closes the thread.

Comments on an unknown or foreign post return 404 with an identical message.

---

## 6. Shared UI infrastructure

### Data table (`components/ui/data-table.tsx`)

Sorting, filtering, pagination, row selection and CSV export. All the logic
lives in `lib/table.ts` as pure functions, so the parts that are easy to get
wrong are unit tested:

- Numbers sort numerically (9 before 10), not lexically.
- Empty values sink to the bottom in **both** directions — absent is not small.
- Sorting is stable, so re-sorting never shuffles equal rows.
- Filtering resets to page 1, and a page past the end clamps instead of showing
  a blank table.
- **CSV injection is neutralised**: a value starting `=`, `+`, `-` or `@` is
  prefixed with a quote, because spreadsheets treat those as formulas and an
  exported caption should not be code in the recipient's Excel.
- Export covers the filtered and sorted set, not just the visible page.

### Toasts (`components/ui/toast.tsx`)

Errors stay until dismissed; successes auto-dismiss after five seconds. An
action that failed deserves more attention than one that worked. `useToast()`
degrades to a no-op outside a provider rather than crashing a page over a
cosmetic concern.

### Keyboard shortcuts (`lib/shortcuts.ts`)

Chords (`⌘K`, `⌘S`) and Gmail-style sequences (`g` then `c`). The matcher is
pure, so the awkward cases are tested: never firing while the user is typing
(except where explicitly allowed, like save), dropping a stale sequence prefix
after 1.2s, treating Ctrl and Cmd as the same modifier, and not mistaking a
checkbox for a typing context. `?` opens a generated reference sheet.

---

## 7. Test coverage

| Suite | Tests |
| --- | --- |
| `packages/domain/src/post-validation.test.ts` | 20 |
| `packages/domain/src/search.test.ts` | 16 |
| `apps/api/test/posts.spec.ts` | 31 |
| `apps/api/test/search.spec.ts` | 12 |
| `apps/api/test/workflow-collaboration.spec.ts` | 15 |
| `apps/web/src/lib/composer.test.ts` | 26 |
| `apps/web/src/lib/table.test.ts` | 31 |
| `apps/web/src/lib/shortcuts.test.ts` | 32 |

Suite total moved from 178 to 362.
