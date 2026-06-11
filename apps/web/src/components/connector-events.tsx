import type { SocialConnectorEvent } from "@ssm/domain";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function ConnectorEvents({ events }: { events: SocialConnectorEvent[] }) {
  const ordered = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Connector events</h3>
          <p className="text-sm text-[var(--muted)]">
            OAuth, token, scope, and account-health events for support operations.
          </p>
        </div>
        <span className="rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm font-medium">
          {ordered.length} events
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {ordered.map((event) => (
          <article key={event.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{event.message}</p>
                <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                  {event.platform} / {event.type.replace(/_/g, " ")} / {formatTime(event.createdAt)}
                </p>
              </div>
              <StatusBadge status={event.severity} />
            </div>
            {Object.keys(event.metadata).length > 0 ? (
              <p className="mt-3 break-all rounded-md bg-white p-2 text-xs text-[var(--muted)]">
                {JSON.stringify(event.metadata)}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
