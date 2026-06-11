import {
  demoApiKeys,
  demoAuditLogs,
  demoTeamMembers,
  demoWebhookDeliveries,
  demoWorkspaceInvitations
} from "@ssm/domain";
import { AppShell } from "@/components/app-shell";
import { AuditLogPanel } from "@/components/audit-log-panel";
import { BillingPanel } from "@/components/billing-panel";
import { TeamAccessPanel } from "@/components/team-access-panel";
import { WebhookDeliveries } from "@/components/webhook-deliveries";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function SettingsPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell workspace={overview.workspace} activeItem="Settings">
      <div className="grid gap-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <BillingPanel />
          <WebhookDeliveries deliveries={demoWebhookDeliveries} />
        </div>
        <TeamAccessPanel
          workspaceId={overview.workspace.id}
          members={demoTeamMembers}
          invitations={demoWorkspaceInvitations}
          apiKeys={demoApiKeys}
        />
        <AuditLogPanel logs={demoAuditLogs} />
      </div>
    </AppShell>
  );
}
