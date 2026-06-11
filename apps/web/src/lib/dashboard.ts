import {
  demoAnalytics,
  demoCampaigns,
  demoPosts,
  demoSocialAccounts,
  demoTrends,
  demoWorkspace,
  type Campaign,
  type Post,
  type SocialAccount,
  type Trend,
  type Workspace
} from "@ssm/domain";

export type DashboardOverview = {
  workspace: Workspace;
  metrics: {
    scheduledPosts: number;
    reviewQueue: number;
    connectedAccounts: number;
    accountsNeedingAttention: number;
    impressions: number;
    engagements: number;
    conversions: number;
  };
  campaigns: Campaign[];
  posts: Post[];
  socialAccounts: SocialAccount[];
  trends: Trend[];
  alerts: Array<{
    id: string;
    type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
  }>;
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

  try {
    const response = await fetch(`${baseUrl}/dashboard/overview`, {
      next: { revalidate: 30 },
      headers: {
        accept: "application/json"
      }
    });

    if (response.ok) {
      return (await response.json()) as DashboardOverview;
    }
  } catch {
    // Local fallback keeps the dashboard renderable before the API is started.
  }

  return localOverview();
}

function localOverview(): DashboardOverview {
  const totals = demoAnalytics.reduce(
    (acc, snapshot) => ({
      impressions: acc.impressions + snapshot.metrics.impressions,
      engagements: acc.engagements + snapshot.metrics.engagements,
      conversions: acc.conversions + snapshot.metrics.conversions
    }),
    { impressions: 0, engagements: 0, conversions: 0 }
  );

  return {
    workspace: demoWorkspace,
    metrics: {
      scheduledPosts: demoPosts.filter((post) => post.status === "scheduled").length,
      reviewQueue: demoPosts.filter((post) => post.status === "in_review").length,
      connectedAccounts: demoSocialAccounts.filter((account) => account.status === "connected").length,
      accountsNeedingAttention: demoSocialAccounts.filter((account) => account.status !== "connected")
        .length,
      ...totals
    },
    campaigns: demoCampaigns,
    posts: demoPosts,
    socialAccounts: demoSocialAccounts,
    trends: demoTrends,
    alerts: [
      {
        id: "fallback-token",
        type: "account_health",
        severity: "warning",
        title: "X account token needs refresh",
        body: "Reconnect @acmegrowth before the next queued post."
      }
    ]
  };
}
