/**
 * Client-side view of the analytics insights endpoint, plus the small pure
 * helpers the explorer needs to render it. The helpers live here rather than
 * inside the component so the awkward cases -- a percentage with no baseline,
 * midnight, a negative delta that should still read as good news -- can be
 * tested without mounting anything.
 */

export type MetricKey = "impressions" | "reach" | "engagements" | "clicks" | "conversions";

export type MetricTotals = Record<MetricKey, number>;

export type MetricRates = {
  engagementRate: number;
  clickThroughRate: number;
  conversionRate: number;
  reachEfficiency: number;
};

export type MetricDelta = {
  metric: MetricKey;
  current: number;
  previous: number;
  absolute: number;
  percent: number | null;
  direction: "up" | "down" | "flat";
};

export type SeriesPoint = MetricTotals & { date: string; trend: number };

export type Anomaly = {
  date: string;
  metric: MetricKey;
  value: number;
  expected: number;
  deviation: number;
  kind: "spike" | "drop";
};

export type PlatformBreakdown = {
  platform: string;
  metrics: MetricTotals;
  rates: MetricRates;
  shareOfImpressions: number;
};

export type PostingTimeBucket = {
  weekday: number;
  hour: number;
  samples: number;
  averageEngagements: number;
  confident: boolean;
};

export type RankedPost = {
  id: string;
  label: string;
  platform: string;
  publishedAt: string;
  metrics: MetricTotals;
  rates: MetricRates;
  value: number;
};

export type Insights = {
  range: { from: string; to: string; days: number; timeZone: string };
  comparison: {
    current: MetricTotals;
    previous: MetricTotals;
    currentRates: MetricRates;
    previousRates: MetricRates;
    deltas: MetricDelta[];
    previousRange: { from: string; to: string };
  };
  series: SeriesPoint[];
  anomalies: Anomaly[];
  byPlatform: PlatformBreakdown[];
  bestTimes: PostingTimeBucket[];
  topPosts: RankedPost[];
  bottomPosts: RankedPost[];
  posts: RankedPost[];
};

export type InsightsQuery = {
  from?: string;
  to?: string;
  timeZone?: string;
  metric?: string;
  platform?: string;
  limit?: number;
};

export const metricLabels: Record<MetricKey, string> = {
  impressions: "Impressions",
  reach: "Reach",
  engagements: "Engagements",
  clicks: "Clicks",
  conversions: "Conversions"
};

export const rangePresets = [
  { id: "7", label: "7 days", days: 7 },
  { id: "28", label: "28 days", days: 28 },
  { id: "90", label: "90 days", days: 90 }
] as const;

const DAY_MS = 86_400_000;

/** Turns a preset into an inclusive `from`/`to` pair ending on `today`. */
export function presetRange(days: number, today: Date): { from: string; to: string } {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const span = Math.max(days, 1);
  return {
    from: new Date(end - (span - 1) * DAY_MS).toISOString().slice(0, 10),
    to: new Date(end).toISOString().slice(0, 10)
  };
}

/** Serialises a query, omitting anything unset so the URL stays readable. */
export function insightsQueryString(query: InsightsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const serialised = params.toString();
  return serialised ? `?${serialised}` : "";
}

/**
 * Renders a period-over-period change.
 *
 * A null percentage means the previous period was zero, which is not infinite
 * growth -- it is a metric that had no baseline. "New" is the honest label.
 */
export function formatDelta(percent: number | null): string {
  if (percent === null) {
    return "New";
  }
  const sign = percent > 0 ? "+" : "";
  return `${sign}${(percent * 100).toFixed(1)}%`;
}

/**
 * Maps a delta to the colour it should wear.
 *
 * Direction and sentiment are not the same thing: for a cost or bounce metric,
 * down is good. `lowerIsBetter` keeps that decision at the call site instead of
 * hardcoding "up is green".
 */
export function deltaTone(
  direction: MetricDelta["direction"],
  options: { lowerIsBetter?: boolean } = {}
): "up" | "down" | "flat" {
  if (direction === "flat") {
    return "flat";
  }
  if (!options.lowerIsBetter) {
    return direction;
  }
  return direction === "up" ? "down" : "up";
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayLabel(weekday: number, style: "long" | "short" = "short"): string {
  const name = weekdayNames[weekday] ?? "";
  return style === "short" ? name.slice(0, 3) : name;
}

/** 0 -> "12am", 9 -> "9am", 12 -> "12pm", 13 -> "1pm". */
export function hourLabel(hour: number): string {
  const normalised = ((Math.trunc(hour) % 24) + 24) % 24;
  const suffix = normalised < 12 ? "am" : "pm";
  const display = normalised % 12 === 0 ? 12 : normalised % 12;
  return `${display}${suffix}`;
}

/** "Tue 9am" — the shape a scheduling recommendation is actually read in. */
export function slotLabel(bucket: { weekday: number; hour: number }): string {
  return `${weekdayLabel(bucket.weekday)} ${hourLabel(bucket.hour)}`;
}

/**
 * One-line summary of an anomaly, phrased as the change rather than the
 * z-score. "3.1 standard deviations" means nothing to a marketing manager.
 */
export function describeAnomaly(anomaly: Anomaly): string {
  const change =
    anomaly.expected === 0
      ? null
      : Math.round(((anomaly.value - anomaly.expected) / anomaly.expected) * 100);
  const verb = anomaly.kind === "spike" ? "above" : "below";
  const magnitude = change === null ? "well" : `${Math.abs(change)}%`;
  return `${metricLabels[anomaly.metric]} ran ${magnitude} ${verb} the recent average.`;
}
