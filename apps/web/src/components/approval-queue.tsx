import type { Post } from "@ssm/domain";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function ApprovalQueue({ posts }: { posts: Post[] }) {
  const reviewPosts = posts.filter((post) => ["in_review", "revisions_needed"].includes(post.status));

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h3 className="text-base font-semibold">Approval queue</h3>
      <div className="mt-4 grid gap-3">
        {reviewPosts.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
            No posts are waiting on review.
          </p>
        ) : (
          reviewPosts.map((post) => (
            <article key={post.id} className="rounded-md border border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-3">
                <time className="text-xs font-medium text-[var(--muted)]">{formatTime(post.scheduledAt)}</time>
                <StatusBadge status={post.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm">{post.content[0]?.text}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
