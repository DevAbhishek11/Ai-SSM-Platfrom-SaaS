import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

export type MetricTrend = "up" | "down" | "flat";

/**
 * KPI tile. `delta` is free text so it can carry either a percentage or a
 * qualifier ("Next 48h"); `trend` drives the colour so a falling metric never
 * renders in success green.
 */
export function MetricCard({
  label,
  value,
  delta,
  trend = "up",
  caption,
  icon: Icon,
  series
}: {
  label: string;
  value: string;
  delta: string;
  trend?: MetricTrend;
  caption?: string;
  icon: LucideIcon;
  /** Optional sparkline values, newest last. */
  series?: number[];
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendClass =
    trend === "up"
      ? "badge badge-success"
      : trend === "down"
        ? "badge badge-danger"
        : "badge badge-plain";

  return (
    <section className="card card-interactive relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <p className="stat-value tabular mt-2">{value}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon aria-hidden="true" size={17} />
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={trendClass}>
          <TrendIcon size={12} aria-hidden="true" />
          {delta}
        </span>
        {caption ? <span className="text-xs text-[var(--muted)]">{caption}</span> : null}
      </div>

      {series && series.length > 1 ? <Sparkline series={series} trend={trend} /> : null}
    </section>
  );
}

function Sparkline({ series, trend }: { series: number[]; trend: MetricTrend }) {
  const width = 120;
  const height = 28;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = width / (series.length - 1);

  const points = series.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const stroke =
    trend === "down" ? "var(--danger)" : trend === "flat" ? "var(--muted)" : "var(--success)";

  return (
    <svg
      className="mt-3 w-full"
      viewBox={`0 0 ${width} ${height}`}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
