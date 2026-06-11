import {
  demoAnalytics,
  demoListeningAlerts,
  demoListeningMonitors,
  demoSocialMentions
} from "@ssm/domain";
import { AnalyticsChart } from "@/components/analytics-chart";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { SocialListeningPanel } from "@/components/social-listening-panel";
import { formatCompactNumber, formatPercent } from "@/lib/format";
import { getDashboardOverview } from "@/lib/dashboard";
import { CheckCircle2, MousePointerClick, TrendingUp } from "lucide-react";

export default async function AnalyticsPage() {
  const overview = await getDashboardOverview();
  const chartData = demoAnalytics.map((snapshot) => ({
    name: snapshot.platform,
    impressions: snapshot.metrics.impressions,
    engagements: snapshot.metrics.engagements
  }));
  const engagementRate = overview.metrics.engagements / Math.max(overview.metrics.impressions, 1);

  return (
    <AppShell workspace={overview.workspace} activeItem="Analytics">
      <div className="grid gap-5">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Impressions"
            value={formatCompactNumber(overview.metrics.impressions)}
            delta="+12.8%"
            icon={TrendingUp}
          />
          <MetricCard
            label="Engagement rate"
            value={formatPercent(engagementRate)}
            delta="+1.6pp"
            icon={MousePointerClick}
          />
          <MetricCard
            label="Conversions"
            value={formatCompactNumber(overview.metrics.conversions)}
            delta="+5.1%"
            icon={CheckCircle2}
          />
        </section>
        <AnalyticsChart data={chartData} />
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
