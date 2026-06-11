import { Injectable } from "@nestjs/common";
import { demoCampaigns, demoPosts } from "@ssm/domain";

@Injectable()
export class CampaignsService {
  list(workspaceId: string) {
    return demoCampaigns
      .filter((campaign) => campaign.workspaceId === workspaceId)
      .map((campaign) => this.withSummary(campaign.id));
  }

  get(id: string) {
    return this.withSummary(id);
  }

  private withSummary(id: string) {
    const campaign = demoCampaigns.find((item) => item.id === id);
    if (!campaign) {
      return undefined;
    }

    const posts = demoPosts.filter((post) => post.campaignId === campaign.id);
    return {
      ...campaign,
      summary: {
        posts: posts.length,
        scheduled: posts.filter((post) => post.status === "scheduled").length,
        inReview: posts.filter((post) => post.status === "in_review").length,
        aiGenerated: posts.filter((post) => post.aiGenerated).length
      }
    };
  }
}
