/**
 * Analytics maths, kept pure and shared between the API and the browser.
 *
 * Reporting is the part of a social tool that gets screenshotted into board
 * decks, so the arithmetic is the product. The rules that are easy to get
 * wrong -- dividing by a zero denominator, growth from a zero baseline, gaps
 * in a time series, small-sample averages that look authoritative -- are
 * handled explicitly here rather than being re-improvised per call site.
 */

export interface MetricTotals {
  impressions: number;
  reach: number;
  engagements: number;
  clicks: number;
  conversions: number;
}

export interface MetricRates {
  /** Engagements per person reached. The number most teams report as "engagement rate". */
  engagementRate: number;
  /** Clicks per impression. */
  clickThroughRate: number;
  /** Conversions per click. */
  conversionRate: number;
  /** Reach per impression: how much of the delivery went to distinct people rather than repeats. */
  reachEfficiency: number;
}

export interface MetricPoint {
  date: string;
  metrics: MetricTotals;
}

export type TrendDirection = "up" | "down" | "flat";

export interface MetricDelta {
  metric: keyof MetricTotals;
  current: number;
  previous: number;
  absolute: number;
  /**
   * Fractional change (0.1 = +10%). `null` when the previous period was zero:
   * growth from nothing is not a percentage, and rendering "+Infinity%" or a
   * fabricated "+100%" in a report is worse than admitting there is no basis
   * for comparison.
   */
  percent: number | null;
  direction: TrendDirection;
}

export interface PeriodComparison {
  current: MetricTotals;
  previous: MetricTotals;
  currentRates: MetricRates;
  previousRates: MetricRates;
  deltas: MetricDelta[];
}

export interface PostingTimeSample {
  publishedAt: string;
  engagements: number;
}

export interface PostingTimeBucket {
  /** 0 = Sunday, matching `Date.prototype.getDay`. */
  weekday: number;
  /** Local hour in the requested time zone, 0-23. */
  hour: number;
  samples: number;
  totalEngagements: number;
  averageEngagements: number;
  /** True once the bucket has enough samples to be worth acting on. */
  confident: boolean;
}

export interface Anomaly {
  date: string;
  metric: keyof MetricTotals;
  value: number;
  expected: number;
  /** Standard deviations from the mean of the preceding window. */
  deviation: number;
  kind: "spike" | "drop";
}

export const metricKeys: readonly (keyof MetricTotals)[] = [
  "impressions",
  "reach",
  "engagements",
  "clicks",
  "conversions"
] as const;

const emptyTotals = (): MetricTotals => ({
  impressions: 0,
  reach: 0,
  engagements: 0,
  clicks: 0,
  conversions: 0
});

const round = (value: number, places = 4): number => {
  const factor = 10 ** places;
  // `Math.round` on a negative half rounds toward +Infinity; symmetry matters
  // for deltas, which are routinely negative.
  const scaled = value * factor;
  const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  return rounded / factor;
};

const safeDivide = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

/** Adds up any number of metric bundles. Missing keys count as zero. */
export function sumMetrics(entries: readonly Partial<MetricTotals>[]): MetricTotals {
  return entries.reduce<MetricTotals>((acc, entry) => {
    for (const key of metricKeys) {
      acc[key] += entry[key] ?? 0;
    }
    return acc;
  }, emptyTotals());
}

/**
 * Derives the ratio metrics. Every denominator is guarded: a workspace with no
 * delivery yet should report 0%, not `NaN`, and certainly not crash the page
 * that renders it.
 */
export function deriveRates(totals: Partial<MetricTotals>): MetricRates {
  const full = sumMetrics([totals]);
  return {
    engagementRate: round(safeDivide(full.engagements, full.reach)),
    clickThroughRate: round(safeDivide(full.clicks, full.impressions)),
    conversionRate: round(safeDivide(full.conversions, full.clicks)),
    reachEfficiency: round(safeDivide(full.reach, full.impressions))
  };
}

/**
 * Fractional change from `previous` to `current`.
 *
 * Returns `null` when there is no baseline to grow from. Callers should render
 * that as "new" rather than a percentage.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return round((current - previous) / Math.abs(previous));
}

const directionOf = (absolute: number, threshold: number): TrendDirection => {
  if (Math.abs(absolute) <= threshold) {
    return "flat";
  }
  return absolute > 0 ? "up" : "down";
};

/**
 * Compares two periods metric by metric.
 *
 * `flatThreshold` exists because a 3-impression move on a 200k base is noise,
 * and painting it green with an up-arrow trains people to ignore the arrows.
 */
export function comparePeriods(
  current: Partial<MetricTotals>,
  previous: Partial<MetricTotals>,
  options: { flatThreshold?: number } = {}
): PeriodComparison {
  const currentTotals = sumMetrics([current]);
  const previousTotals = sumMetrics([previous]);
  const flatThreshold = Math.max(options.flatThreshold ?? 0, 0);

  const deltas = metricKeys.map<MetricDelta>((metric) => {
    const currentValue = currentTotals[metric];
    const previousValue = previousTotals[metric];
    const absolute = currentValue - previousValue;
    return {
      metric,
      current: currentValue,
      previous: previousValue,
      absolute,
      percent: percentChange(currentValue, previousValue),
      direction: directionOf(absolute, flatThreshold)
    };
  });

  return {
    current: currentTotals,
    previous: previousTotals,
    currentRates: deriveRates(currentTotals),
    previousRates: deriveRates(previousTotals),
    deltas
  };
}

const DAY_MS = 86_400_000;

const toUtcDay = (date: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) {
    return null;
  }
  const value = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(value) ? null : value;
};

const toDayKey = (timestamp: number): string => new Date(timestamp).toISOString().slice(0, 10);

/**
 * Produces one point per day between `from` and `to`, inclusive.
 *
 * Days with no data become explicit zeroes. A chart that simply omits them
 * draws a straight line across the gap, which reads as "steady" when the truth
 * is "we published nothing". Same-day duplicates are summed, so several
 * per-account snapshots collapse into a workspace total.
 */
export function buildDailySeries(
  points: readonly MetricPoint[],
  range: { from: string; to: string }
): MetricPoint[] {
  const start = toUtcDay(range.from);
  const end = toUtcDay(range.to);
  if (start === null || end === null || end < start) {
    return [];
  }

  const byDay = new Map<string, Partial<MetricTotals>[]>();
  for (const point of points) {
    const day = toUtcDay(point.date);
    if (day === null || day < start || day > end) {
      continue;
    }
    const key = toDayKey(day);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.push(point.metrics);
    } else {
      byDay.set(key, [point.metrics]);
    }
  }

  const series: MetricPoint[] = [];
  for (let day = start; day <= end; day += DAY_MS) {
    const key = toDayKey(day);
    series.push({ date: key, metrics: sumMetrics(byDay.get(key) ?? []) });
  }
  return series;
}

/**
 * Trailing moving average. Windows shorter than `window` at the start of the
 * series average what exists rather than reporting nothing, so a chart is not
 * blank for its first week.
 */
export function movingAverage(values: readonly number[], window: number): number[] {
  if (window < 1) {
    return [...values];
  }
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    return round(slice.reduce((sum, value) => sum + value, 0) / slice.length, 2);
  });
}

const weekdayIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

/**
 * Buckets historical engagement by local weekday and hour.
 *
 * The time zone is required rather than defaulted: "best time to post" is a
 * statement about the audience's clock, and silently using the server's UTC
 * would shift every recommendation by hours for most of the world.
 *
 * Buckets below `minSamples` are still returned but flagged `confident: false`
 * -- one lucky post at 3am should not become a scheduling recommendation.
 */
export function bestPostingTimes(
  samples: readonly PostingTimeSample[],
  options: { timeZone: string; minSamples?: number; limit?: number } = { timeZone: "UTC" }
): PostingTimeBucket[] {
  const minSamples = Math.max(options.minSamples ?? 3, 1);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: options.timeZone,
    weekday: "short",
    hour: "2-digit",
    hour12: false
  });

  const buckets = new Map<string, PostingTimeBucket>();
  for (const sample of samples) {
    const timestamp = Date.parse(sample.publishedAt);
    if (Number.isNaN(timestamp) || !Number.isFinite(sample.engagements)) {
      continue;
    }
    const parts = formatter.formatToParts(new Date(timestamp));
    const weekdayLabel = parts.find((part) => part.type === "weekday")?.value ?? "";
    const hourLabel = parts.find((part) => part.type === "hour")?.value ?? "";
    const weekday = weekdayIndex[weekdayLabel];
    // Some locales render midnight as "24"; normalise it back to hour 0.
    const hour = Number(hourLabel) % 24;
    if (weekday === undefined || Number.isNaN(hour)) {
      continue;
    }

    const key = `${weekday}-${hour}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.samples += 1;
      existing.totalEngagements += sample.engagements;
    } else {
      buckets.set(key, {
        weekday,
        hour,
        samples: 1,
        totalEngagements: sample.engagements,
        averageEngagements: 0,
        confident: false
      });
    }
  }

  const ranked = [...buckets.values()].map((bucket) => ({
    ...bucket,
    averageEngagements: round(bucket.totalEngagements / bucket.samples, 2),
    confident: bucket.samples >= minSamples
  }));

  ranked.sort((a, b) => {
    // Confident buckets first: a well-evidenced good slot beats a better-looking
    // fluke. Then average, then earliest slot for a stable order.
    if (a.confident !== b.confident) {
      return a.confident ? -1 : 1;
    }
    if (b.averageEngagements !== a.averageEngagements) {
      return b.averageEngagements - a.averageEngagements;
    }
    if (a.weekday !== b.weekday) {
      return a.weekday - b.weekday;
    }
    return a.hour - b.hour;
  });

  return typeof options.limit === "number" ? ranked.slice(0, Math.max(options.limit, 0)) : ranked;
}

/**
 * Flags points that sit far outside the preceding window.
 *
 * Compares each point against the mean and standard deviation of the `window`
 * points before it, so a sustained shift stops being an anomaly once it
 * becomes the new normal -- which is the behaviour you want from an alert.
 * Requires at least three prior points; two points always look like a trend.
 *
 * A z-score on its own is not enough. On a near-flat run of small numbers the
 * standard deviation collapses, and 13 against a mean of 11 scores 2.4 sigma --
 * statistically unusual, operationally meaningless. `minRelativeChange` adds
 * the second condition that the value must also move materially away from the
 * mean, which is what stops the feature from crying wolf on quiet accounts.
 */
export function detectAnomalies(
  series: readonly MetricPoint[],
  options: {
    metric?: keyof MetricTotals;
    window?: number;
    sensitivity?: number;
    minRelativeChange?: number;
  } = {}
): Anomaly[] {
  const metric = options.metric ?? "engagements";
  const window = Math.max(options.window ?? 7, 3);
  const sensitivity = options.sensitivity ?? 2;
  const minRelativeChange = options.minRelativeChange ?? 0.25;
  const anomalies: Anomaly[] = [];

  for (let index = 0; index < series.length; index += 1) {
    const point = series[index];
    if (!point) {
      continue;
    }
    const priorPoints = series.slice(Math.max(0, index - window), index);
    if (priorPoints.length < 3) {
      continue;
    }

    const priorValues = priorPoints.map((entry) => entry.metrics[metric]);
    const mean = priorValues.reduce((sum, value) => sum + value, 0) / priorValues.length;
    const variance =
      priorValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / priorValues.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) {
      continue;
    }

    const value = point.metrics[metric];
    const deviation = (value - mean) / stdDev;
    if (Math.abs(deviation) < sensitivity) {
      continue;
    }
    const relativeChange = mean === 0 ? Infinity : Math.abs(value - mean) / Math.abs(mean);
    if (relativeChange < minRelativeChange) {
      continue;
    }

    anomalies.push({
      date: point.date,
      metric,
      value,
      expected: round(mean, 2),
      deviation: round(deviation, 2),
      kind: deviation > 0 ? "spike" : "drop"
    });
  }

  return anomalies;
}

export interface PerformerRow {
  id: string;
  label: string;
  metrics: MetricTotals;
}

export interface RankedPerformer extends PerformerRow {
  value: number;
  rates: MetricRates;
}

/**
 * Ranks rows by a raw metric or a derived rate.
 *
 * Rate rankings apply a floor on impressions: a post seen twice with one
 * engagement is a 50% engagement rate, and letting that top the leaderboard
 * makes the whole table useless.
 */
export function rankPerformers(
  rows: readonly PerformerRow[],
  options: {
    metric?: keyof MetricTotals | keyof MetricRates;
    limit?: number;
    direction?: "top" | "bottom";
    minImpressions?: number;
  } = {}
): RankedPerformer[] {
  const metric = options.metric ?? "engagements";
  const direction = options.direction ?? "top";
  const isRate = !(metricKeys as readonly string[]).includes(metric);
  const minImpressions = options.minImpressions ?? (isRate ? 100 : 0);

  const ranked = rows
    .filter((row) => row.metrics.impressions >= minImpressions)
    .map<RankedPerformer>((row) => {
      const rates = deriveRates(row.metrics);
      const value = isRate
        ? rates[metric as keyof MetricRates]
        : row.metrics[metric as keyof MetricTotals];
      return { ...row, rates, value };
    });

  ranked.sort((a, b) => (direction === "top" ? b.value - a.value : a.value - b.value));

  return typeof options.limit === "number" ? ranked.slice(0, Math.max(options.limit, 0)) : ranked;
}
