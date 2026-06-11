import { Injectable } from "@nestjs/common";
import { demoCampaigns, demoSocialAccounts, demoTrends, demoWorkspace } from "@ssm/domain";
import { AnalyticsService } from "../analytics/analytics.service.js";
import { PostsService } from "../posts/posts.service.js";
import { SocialService } from "../social/social.service.js";

@Injectable()
export class DashboardService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly postsService: PostsService,
    private readonly socialService: SocialService
  ) {}

  getOverview(workspaceId: string) {
    const analytics = this.analyticsService.getSummary(workspaceId);
    const posts = this.postsService.list({ workspaceId });
    const accountHealth = this.socialService.getAccountHealth(workspaceId);
    const scheduledPosts = posts.filter((post) => post.status === "scheduled").length;
    const reviewQueue = posts.filter((post) =>
      ["in_review", "revisions_needed"].includes(post.status)
    ).length;

    return {
      workspace: demoWorkspace,
      metrics: {
        scheduledPosts,
        reviewQueue,
        connectedAccounts: accountHealth.connected,
        accountsNeedingAttention: accountHealth.needsAttention,
        impressions: analytics.totals.impressions,
        engagements: analytics.totals.engagements,
        conversions: analytics.totals.conversions
      },
      campaigns: demoCampaigns.filter((campaign) => campaign.workspaceId === workspaceId),
      posts,
      socialAccounts: demoSocialAccounts.filter((account) => account.workspaceId === workspaceId),
      trends: demoTrends.filter((trend) => trend.workspaceId === workspaceId),
      alerts: [
        {
          id: "rate-limit-x",
          type: "account_health",
          severity: "warning",
          title: "X account token needs refresh",
          body: "Reconnect @acmegrowth before the next queued post."
        },
        {
          id: "approval-sla",
          type: "approval",
          severity: "info",
          title: "1 post is waiting for review",
          body: "Review queue SLA expires in 18 hours."
        }
      ]
    };
  }
}
