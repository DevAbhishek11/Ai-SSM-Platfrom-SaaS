import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ListChecks } from "lucide-react";
import { demoMediaAssets, type Post } from "@ssm/domain";
import { AppShell } from "@/components/shell/app-shell";
import { PostComposer } from "@/components/composer/post-composer";
import { getDashboardOverview } from "@/lib/dashboard";
import { authorizedFetch } from "@/lib/session";

/**
 * Loads an existing post for editing.
 *
 * A missing post renders the 404 page rather than an empty composer, so a stale
 * link cannot quietly turn an edit into a duplicate.
 */
async function loadPost(id: string): Promise<Post | undefined> {
  try {
    const response = await authorizedFetch(`/posts/${id}`);
    if (response.status === 404) return undefined;
    if (!response.ok) return undefined;
    return (await response.json()) as Post;
  } catch {
    return undefined;
  }
}

export default async function ComposerPage({
  searchParams
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const { post: postId } = await searchParams;
  const overview = await getDashboardOverview();
  const existing = postId ? await loadPost(postId) : undefined;

  if (postId && !existing) {
    notFound();
  }

  const mediaOptions = demoMediaAssets
    .filter((asset) => asset.workspaceId === overview.workspace.id)
    .map((asset) => ({ id: asset.id, fileName: asset.fileName }));

  return (
    <AppShell
      activePath="/composer"
      title={existing ? "Edit post" : "Compose"}
      description="Write once, tailor per network, and check every platform rule before it ships."
      actions={
        <>
          <Link href="/posts" className="btn-secondary">
            <ListChecks size={15} aria-hidden="true" />
            All posts
          </Link>
          <Link href="/calendar" className="btn-secondary">
            <CalendarDays size={15} aria-hidden="true" />
            Calendar
          </Link>
        </>
      }
    >
      <PostComposer
        workspaceId={overview.workspace.id}
        post={existing}
        mediaOptions={mediaOptions}
      />
    </AppShell>
  );
}
