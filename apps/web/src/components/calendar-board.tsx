import Link from "next/link";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import type { Post } from "@ssm/domain";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

/**
 * Chronological view of what is queued to go out, grouped by scheduled day so the
 * next 24 hours are readable at a glance.
 */
export function CalendarBoard({ posts }: { posts: Post[] }) {
  const ordered = [...posts].sort((a, b) =>
    (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt)
  );

  return (
    <section className="card flex flex-col">
      <header className="card-header">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <CalendarDays size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="card-title">Publishing calendar</h3>
            <p className="card-subtitle">Upcoming platform-specific content variants.</p>
          </div>
        </div>
        <Link href="/calendar" className="btn-secondary btn-sm">
          Open calendar
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </header>

      <div className="grid gap-2 p-3">
        {ordered.length === 0 ? (
          <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
            Nothing scheduled yet. Plan your first post from the calendar.
          </p>
        ) : (
          ordered.map((post) => (
            <article
              key={post.id}
              className="group grid gap-3 rounded-[var(--radius-sm)] border border-transparent p-3 transition-colors hover:border-[var(--border)] hover:bg-[var(--panel-soft)] md:grid-cols-[130px_1fr_auto] md:items-center"
            >
              <time className="tabular text-xs font-semibold text-[var(--accent)]">
                {formatTime(post.scheduledAt)}
              </time>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm">{post.content[0]?.text}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {post.content.map((variant) => (
                    <span key={variant.platform} className="chip capitalize">
                      {variant.platform}
                    </span>
                  ))}
                </div>
              </div>
              <StatusBadge status={post.status} />
            </article>
          ))
        )}
      </div>
    </section>
  );
}
