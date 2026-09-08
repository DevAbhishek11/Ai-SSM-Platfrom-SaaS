import Link from "next/link";
import {
  demoListeningAlerts,
  demoListeningMonitors,
  demoReportExports,
  demoReportShareLinks,
  demoReportTemplates,
  demoScheduledReports,
  demoSocialMentions
} from "@ssm/domain";
import { AppShell } from "@/components/shell/app-shell";
import { InsightsExplorer } from "@/components/analytics/insights-explorer";
import { ReportingPanel } from "@/components/reporting-panel";
import { SocialListeningPanel } from "@/components/social-listening-panel";
import { DISPLAY_TIME_ZONE } from "@/lib/format";
import { getDashboardOverview } from "@/lib/dashboard";
import { presetRange } from "@/lib/insights";
import { getInsights } from "@/lib/insights.server";
import { Download, Share2 } from "lucide-react";

export default async function AnalyticsPage() {
  const [overview, insights] = await Promise.all([
    getDashboardOverview(),
    getInsights({
      ...presetRange(28, new Date()),
      timeZone: DISPLAY_TIME_ZONE,
      metric: "engagements",
      limit: 5
    })
  ]);

  return (
    <AppShell
      activePath="/analytics"
      title="Analytics"
      description="Cross-channel performance, social listening, and executive reporting."
      actions={
        <>
          <Link href="/settings" className="btn-secondary">
            <Share2 size={15} aria-hidden="true" />
            Share report
          </Link>
          <Link href="/analytics" className="btn-primary">
            <Download size={15} aria-hidden="true" />
            Export
          </Link>
        </>
      }
    >
      <div className="grid gap-5">
        <InsightsExplorer initial={insights} timeZone={DISPLAY_TIME_ZONE} />
        <ReportingPanel
          workspaceId={overview.workspace.id}
          templates={demoReportTemplates}
          schedules={demoScheduledReports}
          exports={demoReportExports}
          shareLinks={demoReportShareLinks}
        />
        <SocialListeningPanel
          workspaceId={overview.workspace.id}
          monitors={demoListeningMonitors}
          mentions={demoSocialMentions}
          alerts={demoListeningAlerts}
        />
      </div>
    </AppShell>
  );
}
