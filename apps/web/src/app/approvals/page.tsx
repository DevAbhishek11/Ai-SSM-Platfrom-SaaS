import Link from "next/link";
import { CheckCheck, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { ApprovalQueue } from "@/components/approval-queue";
import { NotificationCenter } from "@/components/notification-center";
import { WorkflowActions } from "@/components/workflow-actions";
import { WorkflowTimeline } from "@/components/workflow-timeline";
import { demoNotifications, demoPostComments, demoWorkflowEvents } from "@ssm/domain";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function ApprovalsPage() {
  const overview = await getDashboardOverview();
  const reviewPost =
    overview.posts.find((post) => post.status === "in_review") ?? overview.posts[0] ?? null;

  return (
    <AppShell
      activePath="/approvals"
      title="Approvals"
      description="Review queue, workflow timeline, and notification routing."
      actions={
        <>
          <Link href="/calendar" className="btn-secondary">
            <MessageSquare size={15} aria-hidden="true" />
            Comment thread
          </Link>
          <Link href="/publishing" className="btn-primary">
            <CheckCheck size={15} aria-hidden="true" />
            Approve and schedule
          </Link>
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-5">
          <ApprovalQueue posts={overview.posts} />
          {reviewPost ? <WorkflowActions post={reviewPost} /> : null}
        </div>
        <div className="grid gap-5">
          <WorkflowTimeline
            events={reviewPost ? demoWorkflowEvents.filter((event) => event.postId === reviewPost.id) : []}
            comments={reviewPost ? demoPostComments.filter((comment) => comment.postId === reviewPost.id) : []}
          />
          <NotificationCenter notifications={demoNotifications} />
        </div>
      </div>
    </AppShell>
  );
}
