"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AnalyticsChart({
  data
}: {
  data: Array<{ name: string; impressions: number; engagements: number }>;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold">Performance pulse</h3>
        <p className="text-sm text-[var(--muted)]">Recent reach and engagement by channel.</p>
      </div>
      <div className="mt-4 h-72 min-h-72">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="engagementFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#dbe5df" strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${Number(value) / 1000}k`}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="impressions"
                stroke="#0f766e"
                fill="url(#engagementFill)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="engagements"
                stroke="#027a48"
                fill="transparent"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-md bg-[var(--panel-soft)] text-sm text-[var(--muted)]">
            Loading chart
          </div>
        )}
      </div>
    </section>
  );
}
