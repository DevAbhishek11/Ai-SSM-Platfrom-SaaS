/**
 * Cross-entity search ranking.
 *
 * Kept in the domain package because both tiers need identical ordering: the
 * API ranks server-side results, and the command palette re-ranks locally as
 * the user types so the list does not reshuffle when the network reply lands.
 */

export const searchHitKinds = [
  "post",
  "campaign",
  "media",
  "account",
  "template",
  "member",
  "page"
] as const;
export type SearchHitKind = (typeof searchHitKinds)[number];

export type SearchHit = {
  id: string;
  kind: SearchHitKind;
  title: string;
  subtitle?: string;
  /** Where selecting the hit takes the user. */
  href: string;
  /** Short status/context labels rendered as chips. */
  badges?: string[];
  /** ISO timestamp used to break ties in favour of recent work. */
  timestamp?: string;
  /** Extra text matched against but not displayed. */
  keywords?: string[];
};

export type RankedSearchHit = SearchHit & { score: number };

/** Ordering applied when scores tie, so results feel deliberate. */
const kindWeight: Record<SearchHitKind, number> = {
  page: 6,
  post: 5,
  campaign: 4,
  account: 3,
  template: 2,
  media: 1,
  member: 0
};

export function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Scores one candidate string against a query.
 *
 * The tiers are ordered by how confident the match is: an exact hit beats a
 * prefix, which beats a word boundary, which beats a bare substring. Fuzzy
 * subsequence matching is last so a typo still finds something, but never
 * outranks a real match.
 */
export function scoreMatch(query: string, candidate: string): number {
  const q = normalizeSearchTerm(query);
  const c = normalizeSearchTerm(candidate);

  if (!q) return 0;
  if (!c) return 0;
  if (c === q) return 100;
  if (c.startsWith(q)) return 80 + Math.round((q.length / c.length) * 10);

  const wordStart = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(c);
  if (wordStart) return 65;
  if (c.includes(q)) return 45;

  // Subsequence: every query character appears in order.
  let cursor = 0;
  for (const char of q) {
    const found = c.indexOf(char, cursor);
    if (found === -1) return 0;
    cursor = found + 1;
  }

  // Tighter spans are better matches than characters scattered across a title.
  const density = q.length / Math.max(cursor, 1);
  return Math.round(10 + density * 15);
}

/** Best score across a hit's title, subtitle, badges and hidden keywords. */
export function scoreSearchHit(query: string, hit: SearchHit): number {
  const fields: Array<{ value: string; weight: number }> = [
    { value: hit.title, weight: 1 },
    { value: hit.subtitle ?? "", weight: 0.7 },
    ...(hit.badges ?? []).map((badge) => ({ value: badge, weight: 0.5 })),
    ...(hit.keywords ?? []).map((keyword) => ({ value: keyword, weight: 0.6 }))
  ];

  return fields.reduce((best, field) => {
    const score = scoreMatch(query, field.value) * field.weight;
    return score > best ? score : best;
  }, 0);
}

/**
 * Ranks hits for a query.
 *
 * An empty query is a valid state - it is what the palette shows on open - and
 * returns the most recent items rather than nothing.
 */
export function rankSearchHits(
  query: string,
  hits: SearchHit[],
  options: { limit?: number; minScore?: number } = {}
): RankedSearchHit[] {
  const limit = options.limit ?? 20;
  const minScore = options.minScore ?? 1;
  const trimmed = query.trim();

  if (!trimmed) {
    return [...hits]
      .sort((a, b) => {
        const byTime = (b.timestamp ?? "").localeCompare(a.timestamp ?? "");
        if (byTime !== 0) return byTime;
        return kindWeight[b.kind] - kindWeight[a.kind];
      })
      .slice(0, limit)
      .map((hit) => ({ ...hit, score: 0 }));
  }

  return hits
    .map((hit) => ({ ...hit, score: scoreSearchHit(trimmed, hit) }))
    .filter((hit) => hit.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (kindWeight[b.kind] !== kindWeight[a.kind]) return kindWeight[b.kind] - kindWeight[a.kind];
      return (b.timestamp ?? "").localeCompare(a.timestamp ?? "");
    })
    .slice(0, limit);
}

/** Groups ranked hits by kind while preserving rank order within each group. */
export function groupSearchHits(hits: RankedSearchHit[]): Array<{
  kind: SearchHitKind;
  hits: RankedSearchHit[];
}> {
  const groups = new Map<SearchHitKind, RankedSearchHit[]>();
  for (const hit of hits) {
    const bucket = groups.get(hit.kind);
    if (bucket) {
      bucket.push(hit);
    } else {
      groups.set(hit.kind, [hit]);
    }
  }

  return [...groups.entries()].map(([kind, grouped]) => ({ kind, hits: grouped }));
}
