import { demoSocialConnectorEvents, demoSocialRateLimitBuckets } from "@ssm/domain";
import { AccountHealth } from "@/components/account-health";
import { AppShell } from "@/components/shell/app-shell";
import { ConnectorEvents } from "@/components/connector-events";
import { RateLimitPanel } from "@/components/rate-limit-panel";
import { SocialConnectorPanel } from "@/components/social-connector-panel";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function AccountsPage() {
  const overview = await getDashboardOverview();

  return (
    <AppShell
      activePath="/accounts"
      title="Connected accounts"
      description="Network connections, OAuth scopes, rate-limit budgets, and connector events."
    >
      <div className="grid gap-5">
        <SocialConnectorPanel workspaceId={overview.workspace.id} accounts={overview.socialAccounts} />
        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <AccountHealth accounts={overview.socialAccounts} />
          <RateLimitPanel buckets={demoSocialRateLimitBuckets} accounts={overview.socialAccounts} />
        </div>
        <ConnectorEvents events={demoSocialConnectorEvents} />
      </div>
    </AppShell>
  );
}
