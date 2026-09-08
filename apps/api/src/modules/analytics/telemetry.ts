import { createHash } from "node:crypto";
import { platforms, type MetricTotals, type Platform, type Post } from "@ssm/domain";

/**
 * Deterministic stand-in telemetry.
 *
 * Real numbers will come from the per-network insight APIs via the warehouse.
 * Until that exists, reporting still has to be demonstrable and — more
 * importantly — *testable*, which means the same workspace must produce the
 * same history on every call and in every process. So the figures are derived
 * from a hash of the entity id rather than from `Math.random()`, which would
 * make every assertion flaky and every screenshot different.
 */

const DAY_MS = 86_400_000;

/** Stable 32-bit seed from a string. */
function seedFrom(value: string): number {
  const digest = createHash("sha256").update(value).digest();
  return digest.readUInt32BE(0);
}

/** mulberry32 — small, fast, and identical across runs. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DailyPlatformSnapshot {
  date: string;
  platform: Platform;
  metrics: MetricTotals;
}

/** Baseline daily impressions per network, so the mix looks plausible. */
const platformWeight: Partial<Record<Platform, number>> = {
  instagram: 5200,
  linkedin: 3100,
  x: 2600,
  facebook: 1800,
  tiktok: 4400,
  youtube: 1500,
  pinterest: 700,
  threads: 900,
  mastodon: 220,
  bluesky: 340,
  reddit: 610
};

/**
 * Builds a per-day, per-platform history ending on `to`.
 *
 * The shape is deliberately not flat: there is a weekday effect (weekends run
 * quieter) and occasional seeded spikes, so the anomaly detector and the
 * best-time heatmap have something real to find instead of noise around a
 * constant. Every figure is a pure function of (workspace, platform, date), so
 * two overlapping report windows always agree about a shared day.
 */
export function generateDailySnapshots(
  workspaceId: string,
  activePlatforms: readonly Platform[],
  range: { from: string; to: string }
): DailyPlatformSnapshot[] {
  const start = Date.parse(`${range.from.slice(0, 10)}T00:00:00.000Z`);
  const end = Date.parse(`${range.to.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return [];
  }

  const snapshots: DailyPlatformSnapshot[] = [];
  for (const platform of activePlatforms) {
    const base = platformWeight[platform] ?? 1000;

    for (let dayStart = start; dayStart <= end; dayStart += DAY_MS) {
      const date = new Date(dayStart);
      const key = date.toISOString().slice(0, 10);

      // Seeded per *day*, not per position in the requested window. Walking a
      // sequence from the start of the range made 6 May depend on whether the
      // report began on the 1st or the 5th, so two overlapping windows
      // disagreed about the same day. A day's numbers must be a property of
      // the day.
      const random = makeRandom(seedFrom(`${workspaceId}:${platform}:${key}`));
      const weekday = date.getUTCDay();
      const weekendDrag = weekday === 0 || weekday === 6 ? 0.62 : 1;
      const drift = 0.85 + random() * 0.4;
      // Roughly one outlier every three weeks, decided by the date alone.
      const spike = seedFrom(`${workspaceId}:${platform}:${key}:spike`) % 23 === 0 ? 2.9 : 1;

      const impressions = Math.round(base * weekendDrag * drift * spike);
      const reach = Math.round(impressions * (0.58 + random() * 0.12));
      const engagements = Math.round(reach * (0.035 + random() * 0.045));
      const clicks = Math.round(engagements * (0.18 + random() * 0.14));
      const conversions = Math.round(clicks * (0.04 + random() * 0.06));

      snapshots.push({
        date: key,
        platform,
        metrics: { impressions, reach, engagements, clicks, conversions }
      });
    }
  }

  return snapshots;
}

export interface PostPerformance {
  id: string;
  label: string;
  platform: Platform;
  status: string;
  publishedAt: string;
  metrics: MetricTotals;
}

const firstLine = (post: Post): string => {
  const text = post.content[0]?.text?.trim() ?? "";
  const line = text.split("\n")[0] ?? "";
  return line.length > 72 ? `${line.slice(0, 71)}…` : line || "Untitled post";
};

/**
 * Attaches deterministic performance to posts that have actually gone out.
 *
 * Drafts and scheduled posts are excluded: a table that shows engagement for
 * something nobody has seen invites the reader to compare it against posts
 * that shipped.
 */
export function generatePostPerformance(posts: readonly Post[]): PostPerformance[] {
  return posts
    .filter((post) => post.status === "published")
    .map((post) => {
      const random = makeRandom(seedFrom(post.id));
      const platform = post.content[0]?.platform ?? "x";
      const base = (platformWeight[platform] ?? 1000) * (0.4 + random() * 1.8);
      const impressions = Math.round(base);
      const reach = Math.round(impressions * (0.55 + random() * 0.2));
      const engagements = Math.round(reach * (0.02 + random() * 0.08));
      const clicks = Math.round(engagements * (0.15 + random() * 0.2));
      const conversions = Math.round(clicks * (0.03 + random() * 0.09));

      return {
        id: post.id,
        label: firstLine(post),
        platform,
        status: post.status,
        publishedAt: post.publishedAt ?? post.scheduledAt ?? post.updatedAt,
        metrics: { impressions, reach, engagements, clicks, conversions }
      };
    });
}

/** Networks a workspace actually uses, falling back to a sensible demo mix. */
export function activePlatformsFor(posts: readonly Post[]): Platform[] {
  const used = new Set<Platform>();
  for (const post of posts) {
    for (const variant of post.content) {
      if ((platforms as readonly string[]).includes(variant.platform)) {
        used.add(variant.platform);
      }
    }
  }
  return used.size > 0 ? [...used].sort() : ["instagram", "linkedin", "x"];
}
