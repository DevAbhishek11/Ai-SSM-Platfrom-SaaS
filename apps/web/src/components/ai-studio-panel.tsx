import type { Trend } from "@ssm/domain";
import { Sparkles } from "lucide-react";

export function AiStudioPanel({ trends }: { trends: Trend[] }) {
  const topTrend = [...trends].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
          <Sparkles size={19} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-semibold">AI studio</h3>
          <p className="text-sm text-[var(--muted)]">Generate safe, brand-aware variants from a trend.</p>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
        <p className="text-xs font-semibold uppercase text-[var(--accent)]">Suggested brief</p>
        <p className="mt-2 text-sm">
          Turn <strong>{topTrend?.keyword ?? "AI content operations"}</strong> into a launch sequence for
          LinkedIn, Instagram, and X. Keep the tone practical and confident.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-[var(--border)] p-3">
          <strong className="block text-lg">96</strong>
          <span className="text-xs text-[var(--muted)]">Quality</span>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <strong className="block text-lg">0.12</strong>
          <span className="text-xs text-[var(--muted)]">Risk</span>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <strong className="block text-lg">3</strong>
          <span className="text-xs text-[var(--muted)]">Variants</span>
        </div>
      </div>
      <button className="mt-4 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">
        Generate variants
      </button>
    </section>
  );
}
