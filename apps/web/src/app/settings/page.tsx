import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import {
  demoApiKeys,
  demoAuditLogs,
  demoAuthSessions,
  demoLocalizationPreference,
  demoNotificationDeliveryAttempts,
  demoNotificationPreferences,
  demoRegionalComplianceProfile,
  demoSsoConnections,
  demoTeamMembers,
  demoTrustedDevices,
  demoWebhookDeliveries,
  demoWorkspaceInvitations
} from "@ssm/domain";
import { AccountSecurityPanel } from "@/components/settings/account-security-panel";
import { AppShell } from "@/components/shell/app-shell";
import { AuditLogPanel } from "@/components/audit-log-panel";
import { BillingPanel } from "@/components/billing-panel";
import { IdentitySecurityPanel } from "@/components/identity-security-panel";
import { LocalizationSettingsPanel } from "@/components/localization-settings-panel";
import { NotificationPreferencesPanel } from "@/components/notification-preferences-panel";
import { TeamAccessPanel } from "@/components/team-access-panel";
import { WebhookDeliveries } from "@/components/webhook-deliveries";
import { getDashboardOverview } from "@/lib/dashboard";
import { getSession } from "@/lib/session";

export default async function SettingsPage() {
  const [overview, session] = await Promise.all([getDashboardOverview(), getSession()]);

  return (
    <AppShell
      activePath="/settings"
      title="Settings"
      description="Security, billing, team access, localization, and integrations."
      actions={
        <Link href="/settings" className="btn-secondary">
          <LifeBuoy size={15} aria-hidden="true" />
          Contact support
        </Link>
      }
    >
      <div className="grid gap-5">
        {session ? <AccountSecurityPanel session={session} /> : null}
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
        <IdentitySecurityPanel
          workspaceId={overview.workspace.id}
          ssoConnections={demoSsoConnections}
          sessions={demoAuthSessions}
          devices={demoTrustedDevices}
        />
        <LocalizationSettingsPanel
          workspaceId={overview.workspace.id}
          userId="77777777-7777-4777-8777-777777777777"
          preference={demoLocalizationPreference}
          complianceProfile={demoRegionalComplianceProfile}
        />
        <NotificationPreferencesPanel
          workspaceId={overview.workspace.id}
          userId="77777777-7777-4777-8777-777777777777"
          preferences={demoNotificationPreferences[0]!}
          deliveries={demoNotificationDeliveryAttempts}
        />
        <AuditLogPanel logs={demoAuditLogs} />
      </div>
    </AppShell>
  );
}
