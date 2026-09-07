import { Flame } from "lucide-react";
import type { Trend } from "@ssm/domain";

/** Opportunity score drives both the ordering and the strength of the meter. */
export function TrendList({ trends }: { trends: Trend[] }) {
  const ranked = [...trends].sort((a, b) => b.opportunityScore - a.opportunityScore);
  const max = ranked[0]?.opportunityScore ?? 100;

  return (
    <section className="card flex flex-col">
      <header className="card-header">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Flame size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="card-title">Trend intelligence</h3>
            <p className="card-subtitle">Ranked by opportunity score.</p>
          </div>
        </div>
      </header>

      <ol className="grid gap-2 p-3">
        {ranked.map((trend, index) => (
          <li
            key={trend.id}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  <span className="mr-1.5 text-[var(--muted)]">{index + 1}.</span>
                  {trend.keyword}
                </p>
                <p className="mt-0.5 text-xs capitalize text-[var(--muted)]">
                  {trend.source}
                  {trend.hashtag ? ` · #${trend.hashtag}` : ""}
                </p>
              </div>
              <span className="badge badge-accent tabular">{trend.opportunityScore}</span>
            </div>
            <div className="progress mt-2.5">
              <span style={{ width: `${Math.round((trend.opportunityScore / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
