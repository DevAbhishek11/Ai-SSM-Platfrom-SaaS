import { AppShell } from "@/components/app-shell";
import { ApprovalQueue } from "@/components/approval-queue";
import { NotificationCenter } from "@/components/notification-center";
import { demoNotifications } from "@ssm/domain";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function ApprovalsPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="Approvals">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <ApprovalQueue posts={overview.posts} />
        <NotificationCenter notifications={demoNotifications} />
      </div>
    </AppShell>
  );
}
