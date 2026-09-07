import { describe, expect, it } from "vitest";
import {
  groupSearchHits,
  normalizeSearchTerm,
  rankSearchHits,
  scoreMatch,
  scoreSearchHit,
  type SearchHit
} from "./search.js";

const hit = (overrides: Partial<SearchHit> & { id: string; title: string }): SearchHit => ({
  kind: "post",
  href: `/posts/${overrides.id}`,
  ...overrides
});

describe("normalizeSearchTerm", () => {
  it("folds case, accents and surrounding space", () => {
    expect(normalizeSearchTerm("  Café ")).toBe("cafe");
  });
});

describe("scoreMatch", () => {
  it("ranks exact above prefix above word-start above substring above fuzzy", () => {
    const exact = scoreMatch("launch", "launch");
    const prefix = scoreMatch("laun", "launch plan");
    const wordStart = scoreMatch("plan", "launch plan");
    const substring = scoreMatch("unch", "relaunched");
    const fuzzy = scoreMatch("lnh", "launch");

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(fuzzy);
    expect(fuzzy).toBeGreaterThan(0);
  });

  it("returns zero when the query is not a subsequence", () => {
    expect(scoreMatch("zzz", "launch")).toBe(0);
  });

  it("returns zero for an empty query or candidate", () => {
    expect(scoreMatch("", "launch")).toBe(0);
    expect(scoreMatch("launch", "")).toBe(0);
  });

  it("does not treat regex metacharacters in the query as a pattern", () => {
    expect(() => scoreMatch("c++ (beta)", "c++ (beta) launch")).not.toThrow();
    expect(scoreMatch("c++ (beta)", "c++ (beta) launch")).toBeGreaterThan(0);
  });

  it("is accent and case insensitive", () => {
    expect(scoreMatch("cafe", "Café")).toBe(100);
  });
});

describe("scoreSearchHit", () => {
  it("matches on the title, subtitle, badges and hidden keywords", () => {
    const candidate = hit({
      id: "1",
      title: "Spring teaser",
      subtitle: "Instagram",
      badges: ["scheduled"],
      keywords: ["q2-campaign"]
    });

    expect(scoreSearchHit("spring", candidate)).toBeGreaterThan(0);
    expect(scoreSearchHit("instagram", candidate)).toBeGreaterThan(0);
    expect(scoreSearchHit("scheduled", candidate)).toBeGreaterThan(0);
    expect(scoreSearchHit("q2-campaign", candidate)).toBeGreaterThan(0);
  });

  it("weights a title match above the same match in a subtitle", () => {
    const inTitle = hit({ id: "1", title: "launch" });
    const inSubtitle = hit({ id: "2", title: "other", subtitle: "launch" });

    expect(scoreSearchHit("launch", inTitle)).toBeGreaterThan(scoreSearchHit("launch", inSubtitle));
  });
});

describe("rankSearchHits", () => {
  const hits: SearchHit[] = [
    hit({ id: "1", title: "Spring launch teaser", timestamp: "2026-01-01T00:00:00.000Z" }),
    hit({ id: "2", title: "Launch", kind: "campaign", href: "/c/2", timestamp: "2026-02-01T00:00:00.000Z" }),
    hit({ id: "3", title: "Unrelated media", kind: "media", href: "/m/3", timestamp: "2026-03-01T00:00:00.000Z" })
  ];

  it("orders by score, best first", () => {
    const ranked = rankSearchHits("launch", hits);
    expect(ranked[0].id).toBe("2");
    expect(ranked.map((entry) => entry.id)).not.toContain("3");
  });

  it("returns the most recent items for an empty query rather than nothing", () => {
    const ranked = rankSearchHits("   ", hits);
    expect(ranked).toHaveLength(3);
    expect(ranked[0].id).toBe("3");
  });

  it("respects the limit", () => {
    expect(rankSearchHits("", hits, { limit: 2 })).toHaveLength(2);
  });

  it("filters out hits below the minimum score", () => {
    expect(rankSearchHits("launch", hits, { minScore: 99 }).map((entry) => entry.id)).toEqual(["2"]);
  });

  it("breaks a score tie by kind, then by recency", () => {
    const tied: SearchHit[] = [
      hit({ id: "a", kind: "member", title: "same", href: "/a", timestamp: "2026-01-01T00:00:00.000Z" }),
      hit({ id: "b", kind: "page", title: "same", href: "/b", timestamp: "2025-01-01T00:00:00.000Z" })
    ];

    expect(rankSearchHits("same", tied)[0].id).toBe("b");
  });

  it("never mutates the input array", () => {
    const input = [...hits];
    rankSearchHits("", input);
    expect(input.map((entry) => entry.id)).toEqual(["1", "2", "3"]);
  });
});

describe("groupSearchHits", () => {
  it("groups by kind while preserving rank order", () => {
    const ranked = rankSearchHits("", [
      hit({ id: "1", title: "p1", timestamp: "2026-03-01T00:00:00.000Z" }),
      hit({ id: "2", kind: "campaign", title: "c1", href: "/c", timestamp: "2026-02-01T00:00:00.000Z" }),
      hit({ id: "3", title: "p2", timestamp: "2026-01-01T00:00:00.000Z" })
    ]);

    const groups = groupSearchHits(ranked);
    expect(groups.map((group) => group.kind)).toEqual(["post", "campaign"]);
    expect(groups[0].hits.map((entry) => entry.id)).toEqual(["1", "3"]);
  });
});
