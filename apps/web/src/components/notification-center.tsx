import type { Notification } from "@ssm/domain";
import { formatTime } from "@/lib/format";

export function NotificationCenter({ notifications }: { notifications: Notification[] }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Notification center</h3>
      <div className="mt-4 grid gap-3">
        {notifications.map((notification) => (
          <article key={notification.id} className="rounded-md border border-[var(--border)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{notification.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{notification.body}</p>
              </div>
              {!notification.read ? (
                <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white">
                  New
                </span>
              ) : null}
            </div>
            <time className="mt-2 block text-xs text-[var(--muted)]">{formatTime(notification.createdAt)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}
