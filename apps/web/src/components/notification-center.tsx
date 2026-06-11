import type { Notification } from "@ssm/domain";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function NotificationCenter({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter((notification) => !notification.read).length;

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Notification center</h3>
          <p className="text-sm text-[var(--muted)]">{unread} unread alert(s)</p>
        </div>
        <span className="rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm font-medium">
          {notifications.length} total
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {notifications.map((notification) => (
          <article key={notification.id} className="rounded-md border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{notification.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{notification.body}</p>
              </div>
              <StatusBadge status={notification.read ? "delivered" : "pending"} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span>{notification.type.replace(/_/g, " ")}</span>
              <time>{formatTime(notification.createdAt)}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
