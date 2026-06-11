import { Injectable } from "@nestjs/common";
import { demoMediaAssets, demoPosts, demoSocialAccounts, planLimits } from "@ssm/domain";

@Injectable()
export class BillingService {
  plans() {
    return planLimits;
  }

  usage(workspaceId: string) {
    const storageBytes = demoMediaAssets
      .filter((asset) => asset.workspaceId === workspaceId)
      .reduce((sum, asset) => sum + asset.fileSize, 0);

    return {
      workspaceId,
      plan: "business",
      limits: planLimits.business,
      usage: {
        workspaces: 1,
        socialAccounts: demoSocialAccounts.filter((account) => account.workspaceId === workspaceId).length,
        postsThisMonth: demoPosts.filter((post) => post.workspaceId === workspaceId).length,
        aiGenerations: demoPosts.filter((post) => post.workspaceId === workspaceId && post.aiGenerated).length,
        teamMembers: 4,
        mediaStorageGb: Number((storageBytes / 1024 / 1024 / 1024).toFixed(3))
      }
    };
  }
}
