import type { Trend } from "@ssm/domain";

export function TrendList({ trends }: { trends: Trend[] }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Trend intelligence</h3>
      <div className="mt-4 grid gap-3">
        {trends.map((trend) => (
          <article key={trend.id} className="rounded-md border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{trend.keyword}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {trend.source} {trend.hashtag ? `#${trend.hashtag}` : ""}
                </p>
              </div>
              <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                {trend.opportunityScore}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
