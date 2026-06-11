import type { PostStatus } from "@ssm/domain";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  revisions_needed: "Needs changes",
  approved: "Approved",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  archived: "Archived",
  connected: "Connected",
  expired: "Expired",
  revoked: "Revoked",
  error: "Error",
  pending: "Pending",
  consumed: "Consumed",
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
  accepted: "Accepted",
  warning: "Warning",
  critical: "Critical",
  info: "Info",
  delivered: "Delivered",
  queued: "Queued",
  processing: "Processing",
  retrying: "Retrying",
  succeeded: "Succeeded",
  canceled: "Canceled",
  virus_scanning: "Virus scan",
  format_detecting: "Detecting",
  optimizing: "Optimizing",
  thumbnailing: "Thumbnailing",
  ai_tagging: "AI tagging",
  storing: "Storing",
  cdn_distributing: "CDN"
};

const toneClasses: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700 border-neutral-200",
  in_review: "bg-amber-50 text-amber-800 border-amber-200",
  revisions_needed: "bg-red-50 text-red-800 border-red-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  scheduled: "bg-teal-50 text-teal-800 border-teal-200",
  publishing: "bg-sky-50 text-sky-800 border-sky-200",
  published: "bg-emerald-50 text-emerald-800 border-emerald-200",
  failed: "bg-red-50 text-red-800 border-red-200",
  archived: "bg-neutral-100 text-neutral-700 border-neutral-200",
  connected: "bg-emerald-50 text-emerald-800 border-emerald-200",
  expired: "bg-amber-50 text-amber-800 border-amber-200",
  revoked: "bg-red-50 text-red-800 border-red-200",
  error: "bg-red-50 text-red-800 border-red-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  consumed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  invited: "bg-amber-50 text-amber-800 border-amber-200",
  suspended: "bg-red-50 text-red-800 border-red-200",
  accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  critical: "bg-red-50 text-red-800 border-red-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  delivered: "bg-emerald-50 text-emerald-800 border-emerald-200",
  queued: "bg-teal-50 text-teal-800 border-teal-200",
  processing: "bg-sky-50 text-sky-800 border-sky-200",
  retrying: "bg-amber-50 text-amber-800 border-amber-200",
  succeeded: "bg-emerald-50 text-emerald-800 border-emerald-200",
  canceled: "bg-neutral-100 text-neutral-700 border-neutral-200",
  virus_scanning: "bg-sky-50 text-sky-800 border-sky-200",
  format_detecting: "bg-sky-50 text-sky-800 border-sky-200",
  optimizing: "bg-teal-50 text-teal-800 border-teal-200",
  thumbnailing: "bg-teal-50 text-teal-800 border-teal-200",
  ai_tagging: "bg-indigo-50 text-indigo-800 border-indigo-200",
  storing: "bg-amber-50 text-amber-800 border-amber-200",
  cdn_distributing: "bg-amber-50 text-amber-800 border-amber-200"
};

export function StatusBadge({ status }: { status: PostStatus | string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${
        toneClasses[status] ?? toneClasses.draft
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
