import type { Post } from "@ssm/domain";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function CalendarBoard({ posts }: { posts: Post[] }) {
  const ordered = [...posts].sort((a, b) =>
    (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt)
  );

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Publishing calendar</h3>
          <p className="text-sm text-[var(--muted)]">Upcoming platform-specific content variants.</p>
        </div>
        <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium">
          Weekly view
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {ordered.map((post) => (
          <article
            key={post.id}
            className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3 md:grid-cols-[150px_1fr_auto]"
          >
            <time className="text-sm font-semibold text-[var(--accent)]">{formatTime(post.scheduledAt)}</time>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-medium">{post.content[0]?.text}</p>
              <p className="mt-1 text-xs uppercase text-[var(--muted)]">
                {post.content.map((variant) => variant.platform).join(" + ")}
              </p>
            </div>
            <StatusBadge status={post.status} />
          </article>
        ))}
      </div>
    </section>
  );
}
