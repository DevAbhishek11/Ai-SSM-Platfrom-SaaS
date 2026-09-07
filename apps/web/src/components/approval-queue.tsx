import Link from "next/link";
import { ArrowUpRight, ClipboardCheck } from "lucide-react";
import type { Post } from "@ssm/domain";
import { formatRelativeTime, formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function ApprovalQueue({ posts }: { posts: Post[] }) {
  const reviewPosts = posts.filter((post) => ["in_review", "revisions_needed"].includes(post.status));

  return (
    <section className="card flex flex-col">
      <header className="card-header">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <ClipboardCheck size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="card-title">
              Approval queue
              {reviewPosts.length > 0 ? (
                <span className="badge badge-warning ml-2">{reviewPosts.length}</span>
              ) : null}
            </h3>
            <p className="card-subtitle">Drafts waiting on a reviewer decision.</p>
          </div>
        </div>
        <Link href="/approvals" className="btn-secondary btn-sm">
          Review
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </header>

      <div className="grid gap-2 p-3">
        {reviewPosts.length === 0 ? (
          <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
            Nothing is waiting on review. Nice work.
          </p>
        ) : (
          reviewPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-soft)] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <time className="text-xs font-medium text-[var(--muted)]">
                  {formatTime(post.scheduledAt)}
                </time>
                <StatusBadge status={post.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm">{post.content[0]?.text}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Updated {formatRelativeTime(post.updatedAt ?? post.createdAt)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
