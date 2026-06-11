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
  delivered: "Delivered"
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
  delivered: "bg-emerald-50 text-emerald-800 border-emerald-200"
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
