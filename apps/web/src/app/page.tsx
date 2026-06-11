import { CalendarClock, CheckCircle2, MousePointerClick, TrendingUp } from "lucide-react";
import { demoAnalytics } from "@ssm/domain";
import { AccountHealth } from "@/components/account-health";
import { AiStudioPanel } from "@/components/ai-studio-panel";
import { AnalyticsChart } from "@/components/analytics-chart";
import { AppShell } from "@/components/app-shell";
import { ApprovalQueue } from "@/components/approval-queue";
import { CalendarBoard } from "@/components/calendar-board";
import { MetricCard } from "@/components/metric-card";
import { TrendList } from "@/components/trend-list";
import { formatCompactNumber } from "@/lib/format";
import { getDashboardOverview } from "@/lib/dashboard";

export default async function DashboardPage() {
  const overview = await getDashboardOverview();
  const activeCampaign = overview.campaigns[0];
  const chartData = demoAnalytics.map((snapshot) => ({
    name: snapshot.platform,
    impressions: snapshot.metrics.impressions,
    engagements: snapshot.metrics.engagements
  }));

  return (
    <AppShell workspace={overview.workspace} activeItem="Dashboard">
      <div className="grid gap-5">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--accent)]">Active campaign</p>
              <h2 className="mt-1 text-2xl font-semibold">{activeCampaign?.name ?? "Launch calendar"}</h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
                AI-assisted planning, approval workflow, account health, and performance insights in one
                workspace.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-md bg-[var(--panel-soft)] px-3 py-2">
                <strong className="block">{overview.metrics.connectedAccounts}</strong>
                <span className="text-[var(--muted)]">connected</span>
              </div>
              <div className="rounded-md bg-[var(--panel-soft)] px-3 py-2">
                <strong className="block">{overview.metrics.accountsNeedingAttention}</strong>
                <span className="text-[var(--muted)]">attention</span>
              </div>
              <div className="rounded-md bg-[var(--panel-soft)] px-3 py-2">
                <strong className="block">{overview.metrics.reviewQueue}</strong>
                <span className="text-[var(--muted)]">reviews</span>
              </div>
              <div className="rounded-md bg-[var(--panel-soft)] px-3 py-2">
                <strong className="block">{overview.metrics.scheduledPosts}</strong>
                <span className="text-[var(--muted)]">scheduled</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Workspace metrics">
          <MetricCard
            label="Impressions"
            value={formatCompactNumber(overview.metrics.impressions)}
            delta="+12.8%"
            icon={TrendingUp}
          />
          <MetricCard
            label="Engagements"
            value={formatCompactNumber(overview.metrics.engagements)}
            delta="+8.4%"
            icon={MousePointerClick}
          />
          <MetricCard
            label="Scheduled posts"
            value={String(overview.metrics.scheduledPosts)}
            delta="Next 48h"
            icon={CalendarClock}
          />
          <MetricCard
            label="Conversions"
            value={formatCompactNumber(overview.metrics.conversions)}
            delta="+5.1%"
            icon={CheckCircle2}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
          <CalendarBoard posts={overview.posts} />
          <div className="grid gap-5">
            <AiStudioPanel trends={overview.trends} />
            <AccountHealth accounts={overview.socialAccounts} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr_0.85fr]">
          <AnalyticsChart data={chartData} />
          <ApprovalQueue posts={overview.posts} />
          <TrendList trends={overview.trends} />
        </section>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
          <h3 className="text-base font-semibold">Live alerts</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {overview.alerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-md border border-[var(--border)] bg-[var(--panel-soft)] p-3"
              >
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{alert.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
