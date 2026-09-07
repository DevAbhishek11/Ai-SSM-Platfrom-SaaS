"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Clock,
  Loader2,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
  Users
} from "lucide-react";
import { AnalyticsChart } from "@/components/analytics-chart";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricCard } from "@/components/metric-card";
import { useToast } from "@/components/ui/toast";
import { apiGet } from "@/lib/client-api";
import { friendlyMessage, toApiError } from "@/lib/api-error";
import { formatCompactNumber, formatDate, formatPercent } from "@/lib/format";
import {
  deltaTone,
  describeAnomaly,
  formatDelta,
  insightsQueryString,
  metricLabels,
  presetRange,
  rangePresets,
  slotLabel,
  weekdayLabel,
  type Insights,
  type MetricKey,
  type RankedPost
} from "@/lib/insights";

/**
 * Rows carry the sortable figures flattened onto the top level: the table sorts
 * and exports by key, and a nested `metrics.engagements` is neither sortable
 * nor a sensible CSV cell.
 */
type PostRow = RankedPost & {
  impressions: number;
  engagements: number;
  conversions: number;
  engagementRate: number;
};

const headlineMetrics: { key: MetricKey; icon: typeof TrendingUp }[] = [
  { key: "impressions", icon: TrendingUp },
  { key: "reach", icon: Users },
  { key: "engagements", icon: MousePointerClick },
  { key: "conversions", icon: Clock }
];

/**
 * The reporting surface.
 *
 * Every panel is fed from one response so the headline, the chart and the
 * leaderboard can never describe different windows. Changing a filter refetches
 * the whole payload rather than patching pieces of it.
 */
export function InsightsExplorer({
  initial,
  timeZone
}: {
  initial: Insights | null;
  timeZone: string;
}) {
  const { error: showError } = useToast();
  const [insights, setInsights] = useState<Insights | null>(initial);
  const [preset, setPreset] = useState<string>("28");
  const [platform, setPlatform] = useState<string>("");
  const [metric, setMetric] = useState<MetricKey>("engagements");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(initial === null);
  const [, startTransition] = useTransition();

  const load = useCallback(
    async (next: { preset: string; platform: string; metric: MetricKey }) => {
      const days = rangePresets.find((entry) => entry.id === next.preset)?.days ?? 28;
      const range = presetRange(days, new Date());
      setLoading(true);
      try {
        const data = await apiGet<Insights>(
          `/analytics/insights${insightsQueryString({
            ...range,
            timeZone,
            metric: next.metric,
            platform: next.platform || undefined,
            limit: 5
          })}`
        );
        setInsights(data);
        setFailed(false);
      } catch (error) {
        setFailed(true);
        showError("Could not load analytics", friendlyMessage(toApiError(error)));
      } finally {
        setLoading(false);
      }
    },
    [showError, timeZone]
  );

  // Skip the first run: the server already delivered this exact window.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!hydrated) {
      setHydrated(true);
      return;
    }
    startTransition(() => {
      void load({ preset, platform, metric });
    });
  }, [hydrated, load, metric, platform, preset]);

  const chartData = useMemo(
    () =>
      (insights?.series ?? []).map((point) => ({
        name: point.date.slice(5),
        impressions: point.impressions,
        engagements: point.engagements
      })),
    [insights]
  );

  const postColumns = useMemo<DataTableColumn<PostRow>[]>(
    () => [
      { key: "label", header: "Post", sortable: true },
      {
        key: "platform",
        header: "Channel",
        sortable: true,
        render: (row) => <span className="chip">{row.platform}</span>
      },
      {
        key: "publishedAt",
        header: "Published",
        sortable: true,
        render: (row) => formatDate(row.publishedAt)
      },
      {
        key: "impressions",
        header: "Impressions",
        align: "right",
        sortable: true,
        render: (row) => formatCompactNumber(row.metrics.impressions)
      },
      {
        key: "engagements",
        header: "Engagements",
        align: "right",
        sortable: true,
        render: (row) => formatCompactNumber(row.metrics.engagements)
      },
      {
        key: "engagementRate",
        header: "Eng. rate",
        align: "right",
        sortable: true,
        render: (row) => formatPercent(row.rates.engagementRate)
      },
      {
        key: "conversions",
        header: "Conversions",
        align: "right",
        sortable: true,
        render: (row) => formatCompactNumber(row.metrics.conversions)
      }
    ],
    []
  );

  const tableRows = useMemo<PostRow[]>(
    () =>
      (insights?.posts ?? []).map((row) => ({
        ...row,
        // Flattened so sorting and CSV export see scalars, not nested objects.
        impressions: row.metrics.impressions,
        engagements: row.metrics.engagements,
        conversions: row.metrics.conversions,
        engagementRate: row.rates.engagementRate
      })),
    [insights]
  );

  if (!insights) {
    return (
      <section className="card grid place-items-center gap-3 p-10 text-center">
        <AlertTriangle size={22} className="text-[var(--warning)]" aria-hidden="true" />
        <div>
          <p className="font-medium">Reporting is unavailable</p>
          <p className="text-sm text-[var(--muted)]">
            {failed ? "The analytics service did not respond." : "No data for this window yet."}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void load({ preset, platform, metric })}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Try again
        </button>
      </section>
    );
  }

  const deltaFor = (key: MetricKey) =>
    insights.comparison.deltas.find((delta) => delta.metric === key);

  return (
    <div className="grid gap-5">
      <section className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">Window</span>
          <div className="flex gap-1" role="group" aria-label="Reporting window">
            {rangePresets.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === preset ? "chip chip-accent" : "chip"}
                aria-pressed={entry.id === preset}
                onClick={() => setPreset(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
            Channel
            <select
              className="input h-8 py-0 text-sm"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              <option value="">All channels</option>
              {insights.byPlatform.map((row) => (
                <option key={row.platform} value={row.platform}>
                  {row.platform}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
            Focus
            <select
              className="input h-8 py-0 text-sm"
              value={metric}
              onChange={(event) => setMetric(event.target.value as MetricKey)}
            >
              {(Object.keys(metricLabels) as MetricKey[]).map((key) => (
                <option key={key} value={key}>
                  {metricLabels[key]}
                </option>
              ))}
            </select>
          </label>
          <span
            className="flex items-center gap-1 text-xs text-[var(--muted)]"
            aria-live="polite"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                Updating
              </>
            ) : (
              `${insights.range.from} → ${insights.range.to}`
            )}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {headlineMetrics.map(({ key, icon }) => {
          const delta = deltaFor(key);
          return (
            <MetricCard
              key={key}
              label={metricLabels[key]}
              value={formatCompactNumber(insights.comparison.current[key])}
              delta={formatDelta(delta?.percent ?? null)}
              trend={deltaTone(delta?.direction ?? "flat")}
              caption={`vs ${formatCompactNumber(insights.comparison.previous[key])} prior`}
              icon={icon}
              series={insights.series.map((point) => point[key])}
            />
          );
        })}
      </section>

      <AnalyticsChart data={chartData} />

      {insights.anomalies.length > 0 ? (
        <section className="card p-4">
          <h2 className="section-title mb-3">
            <AlertTriangle size={15} aria-hidden="true" />
            Worth a look
          </h2>
          <ul className="grid gap-2">
            {insights.anomalies.slice(0, 4).map((anomaly) => (
              <li
                key={`${anomaly.date}-${anomaly.metric}`}
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <span className={anomaly.kind === "spike" ? "badge badge-success" : "badge badge-danger"}>
                  {anomaly.kind === "spike" ? "Spike" : "Drop"}
                </span>
                <span className="font-medium">{formatDate(anomaly.date)}</span>
                <span className="text-[var(--muted)]">{describeAnomaly(anomaly)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-4">
          <h2 className="section-title mb-1">Channel mix</h2>
          <p className="text-xs text-[var(--muted)]">Share of impressions across this window.</p>
          <ul className="mt-3 grid gap-3">
            {insights.byPlatform.map((row) => (
              <li key={row.platform} className="grid gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{row.platform}</span>
                  <span className="tabular text-[var(--muted)]">
                    {formatCompactNumber(row.metrics.impressions)} · {formatPercent(row.rates.engagementRate)} eng.
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]"
                  role="img"
                  aria-label={`${row.platform}: ${formatPercent(row.shareOfImpressions)} of impressions`}
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.round(row.shareOfImpressions * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="section-title mb-1">Best times to post</h2>
          <p className="text-xs text-[var(--muted)]">
            Local to {insights.range.timeZone}. Slots with too little history are marked provisional.
          </p>
          {insights.bestTimes.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Not enough published history yet to recommend a slot.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {insights.bestTimes.slice(0, 6).map((bucket) => (
                <li
                  key={`${bucket.weekday}-${bucket.hour}`}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{slotLabel(bucket)}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatCompactNumber(bucket.averageEngagements)} avg ·{" "}
                      {bucket.samples} post{bucket.samples === 1 ? "" : "s"}
                    </p>
                  </div>
                  {bucket.confident ? null : <span className="badge badge-plain">Provisional</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DataTable
        rows={tableRows}
        columns={postColumns}
        getRowId={(row) => row.id}
        caption="Post performance"
        searchPlaceholder="Filter posts"
        exportName="post-performance"
        emptyState="No published posts in this window."
      />

      <p className="text-xs text-[var(--muted)]">
        Compared against {insights.comparison.previousRange.from} →{" "}
        {insights.comparison.previousRange.to}. Best-time buckets use{" "}
        {weekdayLabel(1, "long")}-first weeks in {insights.range.timeZone}.
      </p>
    </div>
  );
}
