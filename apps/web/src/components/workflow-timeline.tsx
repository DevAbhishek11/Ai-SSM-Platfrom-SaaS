import type { PostComment, WorkflowEvent } from "@ssm/domain";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function WorkflowTimeline({
  events,
  comments
}: {
  events: WorkflowEvent[];
  comments: PostComment[];
}) {
  const items = [
    ...events.map((event) => ({ type: "event" as const, at: event.createdAt, event })),
    ...comments.map((comment) => ({ type: "comment" as const, at: comment.createdAt, comment }))
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Workflow timeline</h3>
      <div className="mt-4 grid gap-3">
        {items.map((item) =>
          item.type === "event" ? (
            <article key={item.event.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{item.event.action.replace(/_/g, " ")}</p>
                {item.event.toStatus ? <StatusBadge status={item.event.toStatus} /> : null}
              </div>
              {item.event.comment ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{item.event.comment}</p>
              ) : null}
              <time className="mt-2 block text-xs text-[var(--muted)]">{formatTime(item.event.createdAt)}</time>
            </article>
          ) : (
            <article key={item.comment.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
              <p className="text-sm">{item.comment.body}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <time className="text-xs text-[var(--muted)]">{formatTime(item.comment.createdAt)}</time>
                <span className="text-xs text-[var(--muted)]">
                  {item.comment.resolved ? "Resolved" : "Open comment"}
                </span>
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
}
