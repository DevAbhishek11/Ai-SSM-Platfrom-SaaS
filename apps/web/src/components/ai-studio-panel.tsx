import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Trend } from "@ssm/domain";

export function AiStudioPanel({ trends }: { trends: Trend[] }) {
  const topTrend = [...trends].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];

  const stats = [
    { label: "Quality", value: "96" },
    { label: "Risk", value: "0.12" },
    { label: "Variants", value: "3" }
  ];

  return (
    <section className="surface-hero p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] text-white shadow-[var(--shadow-raised)]"
          style={{ background: "var(--accent-gradient)" }}
        >
          <Sparkles size={19} aria-hidden="true" />
        </span>
        <div>
          <h3 className="card-title">AI studio</h3>
          <p className="card-subtitle">Generate safe, brand-aware variants from a live trend.</p>
        </div>
      </div>

      <blockquote className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-soft)] p-3">
        <p className="eyebrow text-[var(--accent)]">Suggested brief</p>
        <p className="mt-1.5 text-sm">
          Turn <strong>{topTrend?.keyword ?? "AI content operations"}</strong> into a launch sequence
          for LinkedIn, Instagram, and X. Keep the tone practical and confident.
        </p>
      </blockquote>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel)] p-2.5"
          >
            <dd className="tabular text-lg font-semibold">{stat.value}</dd>
            <dt className="text-xs text-[var(--muted)]">{stat.label}</dt>
          </div>
        ))}
      </dl>

      <Link href="/ai-studio" className="btn-primary mt-4 w-full">
        <Sparkles size={15} aria-hidden="true" />
        Generate variants
      </Link>
    </section>
  );
}
