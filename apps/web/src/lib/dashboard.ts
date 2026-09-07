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
import { authorizedFetch } from "./session";

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

/**
 * Loads the overview for the *signed-in* user. The API rejects anonymous reads,
 * so the caller's bearer token is attached; the local fixture fallback keeps the
 * page renderable when the API is unreachable (e.g. during local UI work).
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  try {
    const response = await authorizedFetch("/dashboard/overview", {
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
