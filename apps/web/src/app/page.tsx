import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Info,
  MousePointerClick,
  PlusCircle,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import { demoAnalytics, demoOnboardingSteps, demoPublishingJobs } from "@ssm/domain";
import { AccountHealth } from "@/components/account-health";
import { AiStudioPanel } from "@/components/ai-studio-panel";
import { AnalyticsChart } from "@/components/analytics-chart";
import { AppShell } from "@/components/shell/app-shell";
import { ApprovalQueue } from "@/components/approval-queue";
import { CalendarBoard } from "@/components/calendar-board";
import { MetricCard } from "@/components/metric-card";
import { OnboardingChecklistPanel } from "@/components/onboarding-checklist-panel";
import { PublishingQueue } from "@/components/publishing-queue";
import { TrendList } from "@/components/trend-list";
import { formatCompactNumber, formatPercent } from "@/lib/format";
import { getDashboardOverview } from "@/lib/dashboard";

const alertTone = {
  critical: { className: "badge badge-danger", Icon: AlertTriangle, accent: "var(--danger)" },
  warning: { className: "badge badge-warning", Icon: AlertTriangle, accent: "var(--warning)" },
  info: { className: "badge badge-info", Icon: Info, accent: "var(--info)" }
} as const;

export default async function DashboardPage() {
  const overview = await getDashboardOverview();
  const activeCampaign = overview.campaigns[0];

  const chartData = demoAnalytics.map((snapshot) => ({
    name: snapshot.platform,
    impressions: snapshot.metrics.impressions,
    engagements: snapshot.metrics.engagements
  }));

  // Per-channel values double as sparkline series: same data, compact shape.
  const impressionSeries = chartData.map((point) => point.impressions);
  const engagementSeries = chartData.map((point) => point.engagements);
  const conversionSeries = demoAnalytics.map((snapshot) => snapshot.metrics.conversions);
  const engagementRate = overview.metrics.impressions
    ? overview.metrics.engagements / overview.metrics.impressions
    : 0;

  const pulse = [
    { label: "Connected", value: overview.metrics.connectedAccounts, tone: "text-[var(--success)]" },
    {
      label: "Needs attention",
      value: overview.metrics.accountsNeedingAttention,
      tone: overview.metrics.accountsNeedingAttention > 0 ? "text-[var(--warning)]" : undefined
    },
    { label: "In review", value: overview.metrics.reviewQueue },
    { label: "Scheduled", value: overview.metrics.scheduledPosts }
  ];

  return (
    <AppShell
      activePath="/"
      title="Command dashboard"
      description="Workspace health, activation progress, live alerts, and the publishing pulse."
      actions={
        <>
          <Link href="/ai-studio" className="btn-secondary">
            <Sparkles size={15} aria-hidden="true" />
            AI Studio
          </Link>
          <Link href="/calendar" className="btn-primary">
            <PlusCircle size={15} aria-hidden="true" />
            Plan a post
          </Link>
        </>
      }
    >
      <div className="grid gap-5">
        <section className="surface-hero p-5">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 max-w-2xl">
              <span className="badge badge-accent">
                <Target size={11} aria-hidden="true" />
                Active campaign
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                {activeCampaign?.name ?? "Launch calendar"}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {activeCampaign?.objectives?.length
                  ? `${activeCampaign.objectives.slice(0, 2).join(" · ")}.`
                  : "AI-assisted planning, approvals, account health, and performance in one workspace."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="chip tabular">
                  {formatCompactNumber(overview.metrics.impressions)} impressions
                </span>
                <span className="chip tabular">{formatPercent(engagementRate)} engagement rate</span>
                <span className="chip tabular">
                  {formatCompactNumber(overview.metrics.conversions)} conversions
                </span>
              </div>
            </div>

            <dl className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
              {pulse.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 text-center sm:min-w-[7rem]"
                >
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    {item.label}
                  </dt>
                  <dd className={`tabular mt-1 text-xl font-semibold ${item.tone ?? ""}`}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <OnboardingChecklistPanel workspaceId={overview.workspace.id} steps={demoOnboardingSteps} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workspace metrics">
          <MetricCard
            label="Impressions"
            value={formatCompactNumber(overview.metrics.impressions)}
            delta="+12.8%"
            trend="up"
            caption="vs. last 7 days"
            icon={TrendingUp}
            series={impressionSeries}
          />
          <MetricCard
            label="Engagements"
            value={formatCompactNumber(overview.metrics.engagements)}
            delta="+8.4%"
            trend="up"
            caption={`${formatPercent(engagementRate)} of reach`}
            icon={MousePointerClick}
            series={engagementSeries}
          />
          <MetricCard
            label="Scheduled posts"
            value={String(overview.metrics.scheduledPosts)}
            delta="Next 48h"
            trend="flat"
            caption={`${overview.metrics.reviewQueue} awaiting review`}
            icon={CalendarClock}
          />
          <MetricCard
            label="Conversions"
            value={formatCompactNumber(overview.metrics.conversions)}
            delta="+5.1%"
            trend="up"
            caption="attributed this period"
            icon={CheckCircle2}
            series={conversionSeries}
          />
        </section>

        {overview.alerts.length > 0 ? (
          <section aria-label="Live alerts" className="grid gap-3 md:grid-cols-2">
            {overview.alerts.map((alert) => {
              const tone = alertTone[alert.severity] ?? alertTone.info;
              return (
                <article
                  key={alert.id}
                  className="card card-interactive flex items-start gap-3 p-4"
                  style={{ borderLeft: `3px solid ${tone.accent}` }}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)]"
                    style={{ background: "var(--panel-soft)", color: tone.accent }}
                  >
                    <tone.Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <span className={tone.className}>{alert.severity}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{alert.body}</p>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <CalendarBoard posts={overview.posts} />
          <div className="grid content-start gap-5">
            <AiStudioPanel trends={overview.trends} />
            <AccountHealth accounts={overview.socialAccounts} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <AnalyticsChart data={chartData} />
          <ApprovalQueue posts={overview.posts} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <PublishingQueue jobs={demoPublishingJobs} accounts={overview.socialAccounts} />
          <TrendList trends={overview.trends} />
        </section>
      </div>
    </AppShell>
  );
}
