import type { SocialAccount, SocialRateLimitBucket } from "@ssm/domain";
import { formatTime } from "@/lib/format";

export function RateLimitPanel({
  buckets,
  accounts
}: {
  buckets: SocialRateLimitBucket[];
  accounts: SocialAccount[];
}) {
  const ordered = [...buckets].sort((a, b) => a.resetAt.localeCompare(b.resetAt));

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Rate limits</h3>
          <p className="text-sm text-[var(--muted)]">
            Provider buckets that publishing workers must honor before dispatch.
          </p>
        </div>
        <span className="rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm font-medium">
          {ordered.length} buckets
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {ordered.map((bucket) => {
          const account = accounts.find((item) => item.id === bucket.socialAccountId);
          const percent = Math.round((bucket.remaining / bucket.limit) * 100);

          return (
            <article key={bucket.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize">
                    {bucket.platform} {account ? `@${account.username}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {bucket.bucketKey} / resets {formatTime(bucket.resetAt)} / {bucket.windowSeconds}s window
                  </p>
                </div>
                <strong className="text-sm">
                  {bucket.remaining}/{bucket.limit}
                </strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full ${percent < 15 ? "bg-[var(--warning)]" : "bg-[var(--accent)]"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
