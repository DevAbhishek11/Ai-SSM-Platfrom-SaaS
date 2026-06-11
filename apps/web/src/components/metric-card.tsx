import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  delta,
  icon: Icon
}: {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
        <span className="grid size-9 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon aria-hidden="true" size={18} />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <strong className="text-2xl font-semibold text-[var(--foreground)]">{value}</strong>
        <span className="text-sm font-medium text-[var(--success)]">{delta}</span>
      </div>
    </section>
  );
}
