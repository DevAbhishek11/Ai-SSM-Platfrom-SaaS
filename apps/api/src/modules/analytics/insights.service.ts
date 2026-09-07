import { BadRequestException, Injectable } from "@nestjs/common";
import {
  bestPostingTimes,
  buildDailySeries,
  comparePeriods,
  deriveRates,
  detectAnomalies,
  metricKeys,
  movingAverage,
  rankPerformers,
  sumMetrics,
  type MetricRates,
  type MetricTotals,
  type Platform
} from "@ssm/domain";
import { PostsRepository } from "../repositories/posts.repository.js";
import {
  activePlatformsFor,
  generateDailySnapshots,
  generatePostPerformance
} from "./telemetry.js";
import type { InsightsQueryDto } from "./insights.dto.js";

const DAY_MS = 86_400_000;
const DEFAULT_WINDOW_DAYS = 28;
const MAX_WINDOW_DAYS = 366;

const toDay = (value: string): number => Date.parse(`${value.slice(0, 10)}T00:00:00.000Z`);
const toKey = (timestamp: number): string => new Date(timestamp).toISOString().slice(0, 10);

/**
 * Rejects a zone the runtime cannot resolve.
 *
 * `Intl` throws a RangeError for an unknown zone, which would surface as a 500
 * for what is plainly a bad request.
 */
function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    throw new BadRequestException({
      code: "invalid_time_zone",
      message: `"${timeZone}" is not a recognised IANA time zone.`
    });
  }
}

@Injectable()
export class InsightsService {
  constructor(private readonly postsRepository: PostsRepository) {}

  /**
   * The whole reporting payload for one window: totals, period-over-period
   * comparison, a gap-filled daily series with a smoothed line, anomalies,
   * per-network breakdown, best posting slots and post leaderboards.
   *
   * It is one endpoint rather than seven because every panel on the page must
   * describe the *same* window. Separate calls drift the moment a filter
   * changes, and a report where the headline and the chart disagree is worse
   * than no report.
   */
  getInsights(query: InsightsQueryDto & { workspaceId: string }, now = new Date()) {
    const timeZone = query.timeZone ?? "UTC";
    assertTimeZone(timeZone);

    const todayKey = toKey(toDay(now.toISOString()));
    const to = query.to ? toKey(toDay(query.to)) : todayKey;
    const from = query.from
      ? toKey(toDay(query.from))
      : toKey(toDay(to) - (DEFAULT_WINDOW_DAYS - 1) * DAY_MS);

    const start = toDay(from);
    const end = toDay(to);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      throw new BadRequestException({ code: "invalid_range", message: "Dates must be ISO-8601." });
    }
    if (end < start) {
      throw new BadRequestException({
        code: "invalid_range",
        message: "The end of the range is before its start."
      });
    }

    const days = Math.floor((end - start) / DAY_MS) + 1;
    if (days > MAX_WINDOW_DAYS) {
      // Unbounded ranges turn one request into unbounded work.
      throw new BadRequestException({
        code: "range_too_large",
        message: `Reporting windows are capped at ${MAX_WINDOW_DAYS} days; ${days} were requested.`
      });
    }

    const posts = this.postsRepository.listByWorkspace(query.workspaceId);
    let activePlatforms = activePlatformsFor(posts);
    if (query.platform) {
      if (!activePlatforms.includes(query.platform as Platform)) {
        throw new BadRequestException({
          code: "unknown_platform",
          message: `This workspace has no ${query.platform} activity.`
        });
      }
      activePlatforms = [query.platform as Platform];
    }

    // The comparison window is the equally long stretch immediately before.
    const previousEnd = start - DAY_MS;
    const previousStart = previousEnd - (days - 1) * DAY_MS;

    const current = generateDailySnapshots(query.workspaceId, activePlatforms, { from, to });
    const previous = generateDailySnapshots(query.workspaceId, activePlatforms, {
      from: toKey(previousStart),
      to: toKey(previousEnd)
    });

    const series = buildDailySeries(current, { from, to });
    const totals = sumMetrics(series.map((point) => point.metrics));
    const previousTotals = sumMetrics(previous.map((snapshot) => snapshot.metrics));

    const byPlatform = activePlatforms
      .map((platform) => {
        const platformTotals = sumMetrics(
          current.filter((row) => row.platform === platform).map((row) => row.metrics)
        );
        return {
          platform,
          metrics: platformTotals,
          rates: deriveRates(platformTotals),
          shareOfImpressions:
            totals.impressions === 0
              ? 0
              : Number((platformTotals.impressions / totals.impressions).toFixed(4))
        };
      })
      .sort((a, b) => b.metrics.impressions - a.metrics.impressions);

    // The leaderboard has to honour the same window as the headline; a table
    // of all-time winners under a "last 7 days" title is a reporting bug that
    // people act on.
    const windowEnd = end + DAY_MS - 1;
    const performance = generatePostPerformance(posts).filter((row) => {
      if (query.platform && row.platform !== query.platform) {
        return false;
      }
      const published = Date.parse(row.publishedAt);
      return !Number.isNaN(published) && published >= start && published <= windowEnd;
    });
    // The DTO already restricts this to a known metric or rate key.
    const rankMetric = (query.metric ?? "engagements") as keyof MetricTotals | keyof MetricRates;
    const metric = rankMetric as keyof MetricTotals;
    const limit = query.limit ?? 5;

    const trendMetric = metricKeys.includes(metric) ? metric : "engagements";
    // The smoothed line is computed with a week of lead-in from *before* the
    // window, then sliced back. Averaging only what is inside the window makes
    // the first few points depend on where the window happens to start, so the
    // same day would draw at a different height depending on the range picked.
    const TREND_WINDOW = 7;
    const leadInStart = start - (TREND_WINDOW - 1) * DAY_MS;
    const leadInSeries = buildDailySeries(
      generateDailySnapshots(query.workspaceId, activePlatforms, {
        from: toKey(leadInStart),
        to
      }),
      { from: toKey(leadInStart), to }
    );
    const trend = movingAverage(
      leadInSeries.map((entry) => entry.metrics[trendMetric]),
      TREND_WINDOW
    ).slice(TREND_WINDOW - 1);

    return {
      range: { from, to, days, timeZone },
      comparison: {
        ...comparePeriods(totals, previousTotals, { flatThreshold: 0 }),
        previousRange: { from: toKey(previousStart), to: toKey(previousEnd) }
      },
      series: series.map((point, index) => ({
        date: point.date,
        ...point.metrics,
        trend: trend[index] ?? 0
      })),
      anomalies: detectAnomalies(series, { metric: trendMetric }),
      byPlatform,
      bestTimes: bestPostingTimes(
        performance.map((row) => ({
          publishedAt: row.publishedAt,
          engagements: row.metrics.engagements
        })),
        { timeZone, minSamples: 2, limit: 8 }
      ),
      topPosts: rankPerformers(performance, { metric: rankMetric, limit }),
      bottomPosts: rankPerformers(performance, { metric: rankMetric, limit, direction: "bottom" }),
      // Ranked rather than raw so every row carries its derived rates: the
      // table sorts and exports by engagement rate, and shipping half the
      // shape the client expects is how a page ends up blank in production.
      posts: rankPerformers(performance, { metric: rankMetric })
    };
  }
}
