import Link from "next/link";
import { PenSquare } from "lucide-react";
import type { Post } from "@ssm/domain";
import { AppShell } from "@/components/shell/app-shell";
import { PostLibrary } from "@/components/posts/post-library";
import { getSession, authorizedFetch } from "@/lib/session";
import { getDashboardOverview } from "@/lib/dashboard";

type PostsPage = { items: Post[]; total: number };

/**
 * Loads the content library.
 *
 * Falls back to the overview's posts when the listing endpoint is unreachable,
 * so the page degrades to something useful instead of an error boundary.
 */
async function loadPosts(): Promise<Post[]> {
  try {
    const response = await authorizedFetch("/posts?pageSize=100&sort=updatedAt&direction=desc");
    if (!response.ok) return [];
    const payload = (await response.json()) as PostsPage;
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    return [];
  }
}

export default async function PostsPage() {
  const [session, posts, overview] = await Promise.all([
    getSession(),
    loadPosts(),
    getDashboardOverview()
  ]);

  return (
    <AppShell
      activePath="/posts"
      title="Content library"
      description="Every draft, scheduled post and archive in this workspace."
      actions={
        <Link href="/composer" className="btn-primary">
          <PenSquare size={15} aria-hidden="true" />
          New post
        </Link>
      }
    >
      <section className="card p-4">
        <PostLibrary
          posts={posts.length > 0 ? posts : overview.posts}
          permissions={session?.permissions ?? []}
        />
      </section>
    </AppShell>
  );
}
