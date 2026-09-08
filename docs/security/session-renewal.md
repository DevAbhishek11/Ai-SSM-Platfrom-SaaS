# Why Users Were Being Signed Out

**Symptom:** sign in, switch tabs, come back — signed out.

**Cause:** refresh-token rotation with no allowance for concurrency. Three
separate defects stacked on top of each other; each one alone was enough to end
a session that should have continued.

---

## 1. Racing tabs looked like a stolen token

Refresh tokens are single-use. Presenting one that has already been rotated is
the classic signature of a replayed, stolen token, so the API revoked the entire
token family.

The problem is that a browser presents the same refresh token from several
requests **at once**, entirely legitimately:

- two tabs waking up after the access cookie lapsed,
- a link prefetch racing the navigation it belongs to,
- four panels on one page fetching in parallel.

The first request rotated the token; the rest arrived milliseconds later holding
what was now a spent token, and the family was revoked. The user was signed out
of every tab — *including the one that had just successfully refreshed*, because
family revocation kills the brand-new token too.

Reproduced before the fix:

```
tab A -> 200   (gets a fresh token)
tab B -> 401   (trips reuse detection, revokes the family)
winner's brand-new token -> 401   ← signed out everywhere
```

**Fix — a rotation grace window.** For `REFRESH_ROTATION_GRACE_SECONDS`
(default 30) after a token is rotated, re-presenting it returns *the same
replacement* rather than being treated as theft. The racing tabs converge on one
session instead of fighting over it. The replay is only honoured while the
replacement is still valid, so a logout or an admin revoke during the window is
not undone by a straggling request.

Reuse detection is unchanged outside that window, which is what actually catches
a stolen token: an attacker replaying a token they captured is not doing it
within thirty seconds of the legitimate rotation, and if they are, they are
racing the real user for one shared session rather than getting their own.
`refresh-reuse.spec.ts` runs with the grace window disabled and asserts the
original guarantee still holds exactly.

## 2. Renewal happened too late to matter

The proxy only renewed when the access cookie was **missing**. If the cookie was
present but the token inside it had expired — clock skew, or the fifteen-second
gap between the cookie's lifetime and the token's — the request was waved
through, `/auth/me` returned 401, and the page redirected to the login screen.

That redirect is unavoidable at that point: the code that discovers the 401 is a
**server render, and a server render cannot set cookies**. There is no way to
recover; the session is lost even though a perfectly good refresh token is
sitting in the browser.

**Fix — renew proactively.** The proxy reads the `exp` claim (without verifying
it: the API remains the only authority, so a forged claim can at worst cause an
unnecessary refresh) and renews when the token is within 60 seconds of expiry,
unreadable, or absent. Being early costs one cheap call; being late costs the
user their session.

**And the renewed token is handed to the render that triggered it.** Setting a
response cookie only instructs the browser — the server components rendering
that same request would still read the spent token and redirect to login,
undoing the renewal that had just succeeded. The proxy now rewrites the
forwarded `cookie` header so the new token takes effect immediately.

## 3. An API blip was treated as a dead session

`renew()` returned `undefined` for both "the API rejected this token" and "the
API did not answer". The caller responded by deleting every session cookie and
redirecting to the login page. A thirty-second API hiccup therefore signed out
every active user and destroyed their refresh tokens, so they could not get back
in without typing a password — a self-inflicted outage stacked on the first one.

**Fix — distinguish the two.** `renewSession` returns `renewed`, `rejected` or
`unreachable`. Only `rejected` clears cookies. `unreachable` (a network error, a
timeout, a 5xx, or an unparseable body) leaves the session untouched and lets
the page render its own failure state, so the moment the API recovers a reload
restores the session.

This also removed a latent redirect loop: the login route used to bounce anyone
holding a refresh cookie to the dashboard, while the dashboard bounced back to
login because the session could not be resolved. The bounce now requires the
exchange to actually succeed.

---

## Defence in depth: one refresh per burst

Three places could independently refresh — the route-protection proxy, the API
proxy route, and each parallel client fetch. They now share `renewSession`,
which is **single-flight**: concurrent callers exchanging the same token join one
in-flight request rather than starting their own. Four panel fetches produce one
rotation.

This is a de-duplicator, not a cache. The entry is dropped the moment it settles,
because handing out a spent token later would be worse than an extra round trip.
It only coordinates within one process, which is why the server-side grace window
is the actual fix and this is the optimisation.

---

## Verification

| Check | Result |
| --- | --- |
| Three tabs refreshing simultaneously | all 200, converge on one token, still usable |
| The replacement after a racing replay | still valid and rotatable |
| Replay after the grace window | 401, family revoked (unchanged) |
| Logout, then use the token | 401, redirect to `/login?reason=session-expired` |
| API down during renewal | session cookies preserved, no forced sign-out |
| Signed-in user visiting `/login` | bounced to the dashboard |
| Anonymous user visiting `/calendar` | `/login?next=/calendar` |

Covered by 21 unit tests in `sessions.service.spec.ts`, 3 in
`refresh-reuse.spec.ts` (grace disabled), 21 in `session-renewal.test.ts`, and
20 in `proxy.test.ts`.

## Note on the demo build

Sessions are held in memory, so restarting the API invalidates every refresh
token and everyone is legitimately signed out. That is the pending
Drizzle-persistence work, not this bug.
