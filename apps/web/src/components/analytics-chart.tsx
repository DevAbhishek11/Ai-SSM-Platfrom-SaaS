"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCompactNumber } from "@/lib/format";

type Point = { name: string; impressions: number; engagements: number };

/**
 * Reads the resolved token values once the component is mounted so the chart
 * repaints with the correct palette when the user switches theme. Recharts needs
 * concrete colour strings, so `var(--token)` cannot be passed straight through.
 */
function useChartPalette() {
  const [palette, setPalette] = useState({
    primary: "#4f46e5",
    secondary: "#0ea5e9",
    grid: "#e5e9f2",
    axis: "#8b95aa"
  });

  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const value = (token: string, fallback: string) =>
        styles.getPropertyValue(token).trim() || fallback;

      setPalette({
        primary: value("--chart-1", "#4f46e5"),
        secondary: value("--chart-2", "#0ea5e9"),
        grid: value("--chart-grid", "#e5e9f2"),
        axis: value("--chart-axis", "#8b95aa")
      });
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return palette;
}

function ChartTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="card min-w-[9rem] px-3 py-2 text-xs shadow-[var(--shadow-pop)]">
      <p className="font-semibold capitalize">{label}</p>
      <ul className="mt-1.5 grid gap-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="tabular font-semibold">
              {typeof entry.value === "number" ? formatCompactNumber(entry.value) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalyticsChart({ data }: { data: Point[] }) {
  const [mounted, setMounted] = useState(false);
  const palette = useChartPalette();

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalImpressions = data.reduce((total, point) => total + point.impressions, 0);
  const totalEngagements = data.reduce((total, point) => total + point.engagements, 0);
  const engagementRate = totalImpressions ? totalEngagements / totalImpressions : 0;

  return (
    <section className="card flex flex-col">
      <header className="card-header">
        <div>
          <h3 className="card-title">Performance pulse</h3>
          <p className="card-subtitle">Reach and engagement by channel.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip tabular">{formatCompactNumber(totalImpressions)} reach</span>
          <span className="badge badge-accent tabular">
            {(engagementRate * 100).toFixed(1)}% engaged
          </span>
        </div>
      </header>

      <div className="h-64 min-h-64 w-full min-w-0 p-3">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="impressionsFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={palette.primary} stopOpacity={0.34} />
                  <stop offset="100%" stopColor={palette.primary} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="engagementsFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={palette.secondary} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={palette.secondary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={palette.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: palette.axis, fontSize: 11 }}
                tickFormatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
                dy={4}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={54}
                tick={{ fill: palette.axis, fontSize: 11 }}
                tickFormatter={(value) => formatCompactNumber(Number(value))}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: palette.grid }} />
              <Legend
                verticalAlign="top"
                align="right"
                height={24}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: palette.axis, textTransform: "capitalize" }}
              />
              <Area
                type="monotone"
                name="Impressions"
                dataKey="impressions"
                stroke={palette.primary}
                fill="url(#impressionsFill)"
                strokeWidth={2}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                name="Engagements"
                dataKey="engagements"
                stroke={palette.secondary}
                fill="url(#engagementsFill)"
                strokeWidth={2}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-[var(--radius-sm)] bg-[var(--panel-soft)] text-sm text-[var(--muted)]">
            Loading chart
          </div>
        )}
      </div>
    </section>
  );
}
