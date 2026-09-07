import { describe, expect, it } from "vitest";
import {
  bestPostingTimes,
  buildDailySeries,
  comparePeriods,
  deriveRates,
  detectAnomalies,
  movingAverage,
  percentChange,
  rankPerformers,
  sumMetrics,
  type MetricPoint,
  type MetricTotals
} from "./analytics-insights.js";

const totals = (overrides: Partial<MetricTotals> = {}): MetricTotals => ({
  impressions: 0,
  reach: 0,
  engagements: 0,
  clicks: 0,
  conversions: 0,
  ...overrides
});

describe("sumMetrics", () => {
  it("adds every metric across entries", () => {
    const result = sumMetrics([
      totals({ impressions: 100, engagements: 10 }),
      totals({ impressions: 50, clicks: 4 })
    ]);
    expect(result).toEqual(totals({ impressions: 150, engagements: 10, clicks: 4 }));
  });

  it("treats missing keys as zero rather than NaN", () => {
    expect(sumMetrics([{ impressions: 10 }])).toEqual(totals({ impressions: 10 }));
  });

  it("returns zeroes for an empty list", () => {
    expect(sumMetrics([])).toEqual(totals());
  });
});

describe("deriveRates", () => {
  it("computes the four ratios", () => {
    const rates = deriveRates(
      totals({ impressions: 1000, reach: 800, engagements: 80, clicks: 50, conversions: 5 })
    );
    expect(rates.engagementRate).toBe(0.1);
    expect(rates.clickThroughRate).toBe(0.05);
    expect(rates.conversionRate).toBe(0.1);
    expect(rates.reachEfficiency).toBe(0.8);
  });

  it("returns zero instead of NaN when a denominator is zero", () => {
    const rates = deriveRates(totals());
    expect(Object.values(rates).every((value) => value === 0)).toBe(true);
  });

  it("does not divide conversions by zero clicks", () => {
    expect(deriveRates(totals({ conversions: 3 })).conversionRate).toBe(0);
  });
});

describe("percentChange", () => {
  it("reports fractional growth", () => {
    expect(percentChange(150, 100)).toBe(0.5);
  });

  it("reports fractional decline", () => {
    expect(percentChange(80, 100)).toBe(-0.2);
  });

  it("returns null when growing from a zero baseline", () => {
    // There is no percentage growth from nothing; the UI shows "new" instead.
    expect(percentChange(40, 0)).toBeNull();
  });

  it("treats zero to zero as no change rather than null", () => {
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe("comparePeriods", () => {
  it("produces a delta for every metric", () => {
    const comparison = comparePeriods(
      totals({ impressions: 120, engagements: 20 }),
      totals({ impressions: 100, engagements: 25 })
    );
    expect(comparison.deltas).toHaveLength(5);
    const impressions = comparison.deltas.find((delta) => delta.metric === "impressions");
    expect(impressions).toMatchObject({ absolute: 20, percent: 0.2, direction: "up" });
    const engagements = comparison.deltas.find((delta) => delta.metric === "engagements");
    expect(engagements).toMatchObject({ absolute: -5, percent: -0.2, direction: "down" });
  });

  it("calls a move within the flat threshold flat", () => {
    const comparison = comparePeriods(
      totals({ impressions: 200_003 }),
      totals({ impressions: 200_000 }),
      { flatThreshold: 10 }
    );
    expect(comparison.deltas[0]?.direction).toBe("flat");
    // The underlying numbers are still reported honestly.
    expect(comparison.deltas[0]?.absolute).toBe(3);
  });

  it("includes derived rates for both periods", () => {
    const comparison = comparePeriods(
      totals({ reach: 100, engagements: 20 }),
      totals({ reach: 100, engagements: 10 })
    );
    expect(comparison.currentRates.engagementRate).toBe(0.2);
    expect(comparison.previousRates.engagementRate).toBe(0.1);
  });
});

describe("buildDailySeries", () => {
  const point = (date: string, engagements: number): MetricPoint => ({
    date,
    metrics: totals({ engagements })
  });

  it("emits one point per day inclusive of both ends", () => {
    const series = buildDailySeries([], { from: "2026-06-01", to: "2026-06-05" });
    expect(series.map((entry) => entry.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05"
    ]);
  });

  it("fills days with no data as explicit zeroes", () => {
    // A chart that omits the gap draws a flat line across it, which reads as
    // "steady" when the truth is "nothing happened".
    const series = buildDailySeries([point("2026-06-01", 10), point("2026-06-03", 30)], {
      from: "2026-06-01",
      to: "2026-06-03"
    });
    expect(series.map((entry) => entry.metrics.engagements)).toEqual([10, 0, 30]);
  });

  it("sums several snapshots landing on the same day", () => {
    const series = buildDailySeries([point("2026-06-01", 10), point("2026-06-01", 5)], {
      from: "2026-06-01",
      to: "2026-06-01"
    });
    expect(series[0]?.metrics.engagements).toBe(15);
  });

  it("ignores points outside the range", () => {
    const series = buildDailySeries([point("2026-05-30", 999)], {
      from: "2026-06-01",
      to: "2026-06-01"
    });
    expect(series[0]?.metrics.engagements).toBe(0);
  });

  it("accepts full timestamps, not just dates", () => {
    const series = buildDailySeries([point("2026-06-02T14:20:00.000Z", 7)], {
      from: "2026-06-02",
      to: "2026-06-02"
    });
    expect(series[0]?.metrics.engagements).toBe(7);
  });

  it("returns nothing for an inverted range", () => {
    expect(buildDailySeries([], { from: "2026-06-05", to: "2026-06-01" })).toEqual([]);
  });

  it("crosses a month boundary correctly", () => {
    const series = buildDailySeries([], { from: "2026-01-30", to: "2026-02-02" });
    expect(series.map((entry) => entry.date)).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02"
    ]);
  });
});

describe("movingAverage", () => {
  it("smooths over a trailing window", () => {
    expect(movingAverage([10, 20, 30, 40], 2)).toEqual([10, 15, 25, 35]);
  });

  it("averages what exists before the window is full", () => {
    // Otherwise the first week of every chart is blank.
    expect(movingAverage([10, 20], 7)).toEqual([10, 15]);
  });

  it("returns the input for a window of zero", () => {
    expect(movingAverage([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });
});

describe("bestPostingTimes", () => {
  const sample = (publishedAt: string, engagements: number) => ({ publishedAt, engagements });

  it("buckets by local weekday and hour in the requested zone", () => {
    // 03:30 UTC on a Tuesday is 09:00 on the same Tuesday in Kolkata.
    const buckets = bestPostingTimes([sample("2026-06-02T03:30:00.000Z", 100)], {
      timeZone: "Asia/Kolkata",
      minSamples: 1
    });
    expect(buckets[0]).toMatchObject({ weekday: 2, hour: 9, samples: 1 });
  });

  it("shifts the weekday when the time zone crosses midnight", () => {
    // 23:00 UTC Monday is already Tuesday morning in Kolkata.
    const buckets = bestPostingTimes([sample("2026-06-01T23:00:00.000Z", 10)], {
      timeZone: "Asia/Kolkata",
      minSamples: 1
    });
    expect(buckets[0]?.weekday).toBe(2);
  });

  it("averages repeated slots", () => {
    const buckets = bestPostingTimes(
      [sample("2026-06-02T09:00:00.000Z", 100), sample("2026-06-09T09:00:00.000Z", 200)],
      { timeZone: "UTC", minSamples: 1 }
    );
    expect(buckets[0]).toMatchObject({ samples: 2, averageEngagements: 150 });
  });

  it("marks thin buckets as not confident", () => {
    const buckets = bestPostingTimes([sample("2026-06-02T09:00:00.000Z", 5000)], {
      timeZone: "UTC",
      minSamples: 3
    });
    expect(buckets[0]?.confident).toBe(false);
  });

  it("ranks a well-evidenced slot above a single lucky post", () => {
    const buckets = bestPostingTimes(
      [
        sample("2026-06-02T03:00:00.000Z", 9999),
        sample("2026-06-02T09:00:00.000Z", 100),
        sample("2026-06-09T09:00:00.000Z", 100),
        sample("2026-06-16T09:00:00.000Z", 100)
      ],
      { timeZone: "UTC", minSamples: 3 }
    );
    expect(buckets[0]).toMatchObject({ hour: 9, confident: true });
    expect(buckets[1]).toMatchObject({ hour: 3, confident: false });
  });

  it("normalises a midnight rendered as hour 24", () => {
    const buckets = bestPostingTimes([sample("2026-06-02T00:00:00.000Z", 1)], {
      timeZone: "UTC",
      minSamples: 1
    });
    expect(buckets[0]?.hour).toBe(0);
  });

  it("skips unparseable timestamps instead of throwing", () => {
    const buckets = bestPostingTimes(
      [sample("not-a-date", 10), sample("2026-06-02T09:00:00.000Z", 10)],
      { timeZone: "UTC", minSamples: 1 }
    );
    expect(buckets).toHaveLength(1);
  });

  it("honours the limit", () => {
    const buckets = bestPostingTimes(
      [
        sample("2026-06-02T09:00:00.000Z", 10),
        sample("2026-06-02T10:00:00.000Z", 20),
        sample("2026-06-02T11:00:00.000Z", 30)
      ],
      { timeZone: "UTC", minSamples: 1, limit: 2 }
    );
    expect(buckets).toHaveLength(2);
  });
});

describe("detectAnomalies", () => {
  const series = (values: number[]): MetricPoint[] =>
    values.map((engagements, index) => ({
      date: `2026-06-${String(index + 1).padStart(2, "0")}`,
      metrics: totals({ engagements })
    }));

  it("flags a spike well outside the preceding window", () => {
    const found = detectAnomalies(series([100, 105, 98, 102, 400]));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ date: "2026-06-05", kind: "spike" });
  });

  it("flags a collapse", () => {
    const found = detectAnomalies(series([100, 105, 98, 102, 2]));
    expect(found[0]?.kind).toBe("drop");
  });

  it("stays quiet on ordinary variation", () => {
    expect(detectAnomalies(series([100, 105, 98, 102, 101]))).toEqual([]);
  });

  it("needs at least three prior points before judging", () => {
    // Two points always look like a trend.
    expect(detectAnomalies(series([1, 500]))).toEqual([]);
  });

  it("ignores a statistically loud but operationally trivial wobble", () => {
    // 13 against a mean of 11 is 2.4 sigma when the run is that flat. Nobody
    // wants that alert.
    expect(detectAnomalies(series([10, 12, 11, 13]))).toEqual([]);
  });

  it("still flags a large move on small numbers", () => {
    expect(detectAnomalies(series([10, 12, 11, 60]))).toHaveLength(1);
  });

  it("ignores a perfectly flat history rather than dividing by zero", () => {
    const found = detectAnomalies(series([50, 50, 50, 50]));
    expect(found).toEqual([]);
  });

  it("stops alerting once a shift becomes the new normal", () => {
    // A step change is an anomaly on day one and a fact of life by day five.
    const found = detectAnomalies(series([10, 12, 11, 13, 200, 205, 198, 202, 201]), { window: 4 });
    expect(found.map((anomaly) => anomaly.date)).toEqual(["2026-06-05"]);
  });

  it("can watch a metric other than engagements", () => {
    const points: MetricPoint[] = [10, 11, 9, 10, 90].map((clicks, index) => ({
      date: `2026-06-0${index + 1}`,
      metrics: totals({ clicks })
    }));
    const found = detectAnomalies(points, { metric: "clicks" });
    expect(found[0]).toMatchObject({ metric: "clicks", kind: "spike" });
  });
});

describe("rankPerformers", () => {
  const rows = [
    { id: "a", label: "Launch teaser", metrics: totals({ impressions: 10_000, engagements: 300 }) },
    { id: "b", label: "Customer story", metrics: totals({ impressions: 5_000, engagements: 400 }) },
    { id: "c", label: "Tiny test", metrics: totals({ impressions: 4, engagements: 2 }) }
  ];

  it("ranks by raw metric descending", () => {
    const ranked = rankPerformers(rows, { metric: "engagements" });
    expect(ranked.map((row) => row.id)).toEqual(["b", "a", "c"]);
  });

  it("can rank from the bottom to surface what to fix", () => {
    const ranked = rankPerformers(rows, { metric: "engagements", direction: "bottom" });
    expect(ranked[0]?.id).toBe("c");
  });

  it("excludes statistically meaningless rows from rate rankings", () => {
    // "c" has a 50% engagement rate off four impressions; letting that win
    // makes the leaderboard useless.
    const ranked = rankPerformers(rows, { metric: "engagementRate" });
    expect(ranked.map((row) => row.id)).not.toContain("c");
  });

  it("keeps thin rows in raw-count rankings", () => {
    expect(rankPerformers(rows, { metric: "impressions" }).map((row) => row.id)).toContain("c");
  });

  it("attaches derived rates to each row", () => {
    const ranked = rankPerformers([rows[0]!], { metric: "engagements" });
    expect(ranked[0]?.rates.clickThroughRate).toBe(0);
  });

  it("honours the limit", () => {
    expect(rankPerformers(rows, { limit: 1 })).toHaveLength(1);
  });
});
