import type { MediaProcessingJob } from "@ssm/domain";
import { formatCompactNumber, formatTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function MediaProcessingPipeline({ jobs }: { jobs: MediaProcessingJob[] }) {
  const ordered = [...jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Processing pipeline</h3>
          <p className="text-sm text-[var(--muted)]">
            Upload, scan, optimize, thumbnail, tag, store, and distribute assets.
          </p>
        </div>
        <button className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium">
          Process next
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {ordered.map((job) => (
          <article key={job.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{job.fileName}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {job.fileType} / {formatCompactNumber(job.fileSize)}B / updated {formatTime(job.updatedAt)}
                </p>
              </div>
              <StatusBadge status={job.status} />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${job.progress}%` }} />
            </div>
            <div className="mt-3 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
              <span>Step: {job.currentStep.replace(/_/g, " ")}</span>
              <span>Scan: {job.virusScan?.status ?? "pending"}</span>
              {job.output?.optimizedBytes ? <span>Optimized: {formatCompactNumber(job.output.optimizedBytes)}B</span> : null}
              {job.errorMessage ? <span className="text-[var(--danger)]">{job.errorMessage}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
