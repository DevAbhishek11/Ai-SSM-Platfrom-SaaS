import type { PublishingJob, SocialAccount } from "@ssm/domain";
import { formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function PublishingQueue({
  jobs,
  accounts
}: {
  jobs: PublishingJob[];
  accounts: SocialAccount[];
}) {
  const ordered = [...jobs].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Publishing queue</h3>
          <p className="text-sm text-[var(--muted)]">
            Idempotent jobs with retry state and connector delivery metadata.
          </p>
        </div>
        <button className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">
          Process due
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {ordered.map((job) => {
          const account = accounts.find((item) => item.id === job.socialAccountId);

          return (
            <article
              key={job.id}
              className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3 lg:grid-cols-[150px_1fr_auto]"
            >
              <time className="text-sm font-semibold text-[var(--accent)]">{formatTime(job.scheduledFor)}</time>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {job.platform} {account ? `@${account.username}` : ""}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{job.idempotencyKey}</p>
                {job.lastError ? <p className="mt-2 text-sm text-[var(--danger)]">{job.lastError}</p> : null}
                {job.platformPostUrl ? (
                  <a className="mt-2 block text-sm font-medium text-[var(--accent)]" href={job.platformPostUrl}>
                    View published post
                  </a>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">
                  {job.attempts}/{job.maxAttempts}
                </span>
                <StatusBadge status={job.status} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
