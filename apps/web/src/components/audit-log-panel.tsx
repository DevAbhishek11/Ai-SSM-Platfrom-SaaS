import type { AuditLog } from "@ssm/domain";
import { formatTime } from "@/lib/format";

export function AuditLogPanel({ logs }: { logs: AuditLog[] }) {
  const ordered = [...logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const riskSignals = ordered.filter((log) =>
    ["failed", "expired", "revoked", "deleted", "missing"].some((signal) => log.action.includes(signal))
  );
  const categories = ordered.reduce<Record<string, number>>((acc, log) => {
    const category = log.action.split(".")[0] ?? "other";
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Security audit</h3>
          <p className="text-sm text-[var(--muted)]">
            Privileged actions, authentication events, and operational recovery records.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-[var(--panel-soft)] px-3 py-2">
            <strong className="block">{ordered.length}</strong>
            <span className="text-[var(--muted)]">records</span>
          </div>
          <div className="rounded-md bg-[var(--panel-soft)] px-3 py-2">
            <strong className="block">{riskSignals.length}</strong>
            <span className="text-[var(--muted)]">signals</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(categories).map(([category, count]) => (
          <span key={category} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">
            {category}: {count}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {ordered.map((log) => (
          <article key={log.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{log.action}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {log.entityType}
                  {log.entityId ? ` / ${log.entityId}` : ""} / {formatTime(log.createdAt)}
                </p>
              </div>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-medium">
                {log.userId ? "User" : "System"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-[var(--muted)] md:grid-cols-2">
              {log.oldValues ? (
                <p className="break-all rounded-md bg-white p-2">Old: {JSON.stringify(log.oldValues)}</p>
              ) : null}
              {log.newValues ? (
                <p className="break-all rounded-md bg-white p-2">New: {JSON.stringify(log.newValues)}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
