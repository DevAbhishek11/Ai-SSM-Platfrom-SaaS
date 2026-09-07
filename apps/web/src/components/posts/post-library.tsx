"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { CheckCircle2, Copy, Loader2, PenLine, Send, Trash2 } from "lucide-react";
import type { Post } from "@ssm/domain";
import { apiPost } from "@/lib/client-api";
import { friendlyMessage } from "@/lib/api-error";
import { formatTime } from "@/lib/format";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/ui/toast";

type Row = {
  id: string;
  excerpt: string;
  platforms: string;
  status: string;
  scheduledAt: string;
  updatedAt: string;
};

type BulkAction = "submit" | "approve" | "request_changes" | "archive";

const bulkActions: Array<{ id: BulkAction; label: string; icon: typeof Send; permission: string }> = [
  { id: "submit", label: "Send for review", icon: Send, permission: "posts.edit" },
  { id: "approve", label: "Approve", icon: CheckCircle2, permission: "posts.review" },
  { id: "archive", label: "Archive", icon: Trash2, permission: "posts.edit" }
];

/**
 * The content library.
 *
 * Bulk actions report per-item outcomes because partial success is normal here:
 * a reviewer selects a dozen posts and two of them moved on since the page
 * rendered. Reporting "3 of 12 failed" beats a single red banner that hides
 * which ones went through.
 */
export function PostLibrary({
  posts,
  permissions
}: {
  posts: Post[];
  permissions: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [running, setRunning] = useState<BulkAction | undefined>();

  const rows = useMemo<Row[]>(
    () =>
      posts.map((post) => ({
        id: post.id,
        excerpt: post.content[0]?.text.replace(/\s+/g, " ").slice(0, 90) ?? "—",
        platforms: post.content.map((variant) => variant.platform).join(", "),
        status: post.status,
        scheduledAt: post.scheduledAt ?? "",
        updatedAt: post.updatedAt
      })),
    [posts]
  );

  const runBulk = async (action: BulkAction) => {
    if (selected.length === 0) return;
    setRunning(action);

    try {
      const result = await apiPost<{
        succeeded: number;
        failed: number;
        results: Array<{ postId: string; ok: boolean; error?: string }>;
      }>("/workflow/posts/bulk", { postIds: selected, action });

      if (result.failed === 0) {
        toast.success(`${result.succeeded} post(s) updated`);
      } else {
        const firstError = result.results.find((entry) => !entry.ok)?.error;
        toast.toast({
          tone: "warning",
          title: `${result.succeeded} updated, ${result.failed} skipped`,
          description: firstError
        });
      }

      setSelected([]);
      router.refresh();
    } catch (error) {
      toast.error("Bulk action failed", friendlyMessage(error));
    } finally {
      setRunning(undefined);
    }
  };

  const duplicate = async (id: string) => {
    try {
      const copy = await apiPost<Post>(`/posts/${id}/duplicate`);
      toast.success("Duplicated", "Opening the copy.");
      router.push(`/composer?post=${copy.id}` as Route);
    } catch (error) {
      toast.error("Could not duplicate", friendlyMessage(error));
    }
  };

  const columns: Array<DataTableColumn<Row>> = [
    {
      key: "excerpt",
      header: "Post",
      render: (row) => (
        <Link href={`/composer?post=${row.id}` as Route} className="font-medium hover:underline">
          {row.excerpt}
        </Link>
      )
    },
    { key: "platforms", header: "Channels" },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: "scheduledAt",
      header: "Scheduled",
      render: (row) => (row.scheduledAt ? formatTime(row.scheduledAt) : "—")
    },
    {
      key: "updatedAt",
      header: "",
      sortable: false,
      align: "right",
      render: (row) => (
        <span className="inline-flex gap-1">
          <Link
            href={`/composer?post=${row.id}` as Route}
            className="btn-ghost"
            aria-label="Edit post"
          >
            <PenLine size={14} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="btn-ghost"
            aria-label="Duplicate post"
            onClick={() => void duplicate(row.id)}
          >
            <Copy size={14} aria-hidden="true" />
          </button>
        </span>
      )
    }
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      caption="All posts"
      searchPlaceholder="Filter posts…"
      exportName="posts"
      selectable
      selectedIds={selected}
      onSelectionChange={setSelected}
      emptyState="No posts match these filters."
      toolbar={
        selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--muted)]">{selected.length} selected</span>
            {bulkActions
              .filter((action) => permissions.includes(action.permission))
              .map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="btn-secondary"
                  disabled={Boolean(running)}
                  onClick={() => void runBulk(action.id)}
                >
                  {running === action.id ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <action.icon size={14} aria-hidden="true" />
                  )}
                  {action.label}
                </button>
              ))}
          </div>
        ) : null
      }
    />
  );
}
