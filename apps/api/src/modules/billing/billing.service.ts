import { BadRequestException, Injectable } from "@nestjs/common";
import {
  demoApiKeys,
  demoMediaAssets,
  demoPosts,
  demoSocialAccounts,
  demoTeamMembers,
  demoWorkspaceInvitations,
  planLimits,
  type Plan
} from "@ssm/domain";

export const entitlementCapabilities = [
  "workspaces",
  "socialAccounts",
  "postsThisMonth",
  "aiGenerations",
  "teamMembers",
  "mediaStorageGb",
  "apiAccess"
] as const;

export type EntitlementCapability = (typeof entitlementCapabilities)[number];

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
        teamMembers:
          demoTeamMembers.filter((member) => member.workspaceId === workspaceId).length +
          demoWorkspaceInvitations.filter(
            (invite) => invite.workspaceId === workspaceId && invite.status === "pending"
          ).length,
        mediaStorageGb: Number((storageBytes / 1024 / 1024 / 1024).toFixed(3)),
        apiKeys: demoApiKeys.filter((apiKey) => apiKey.workspaceId === workspaceId && apiKey.status === "active")
          .length
      }
    };
  }

  check(workspaceId: string, capability: EntitlementCapability, increment = 0) {
    const usage = this.usage(workspaceId);
    const plan = usage.plan as Plan;
    const limits = planLimits[plan];

    if (capability === "apiAccess") {
      return {
        workspaceId,
        plan,
        capability,
        allowed: limits.apiAccess !== "none",
        limit: limits.apiAccess,
        usage: usage.usage.apiKeys,
        projected: usage.usage.apiKeys + increment
      };
    }

    const limitKey = capability === "postsThisMonth" ? "postsPerMonth" : capability;
    const limit = limits[limitKey];
    const currentUsage = usage.usage[capability];
    const projected = currentUsage + increment;
    const allowed = limit === "unlimited" || limit === "custom" || projected <= limit;

    return {
      workspaceId,
      plan,
      capability,
      allowed,
      limit,
      usage: currentUsage,
      projected
    };
  }

  assertAllowed(workspaceId: string, capability: EntitlementCapability, increment = 1) {
    const result = this.check(workspaceId, capability, increment);
    if (!result.allowed) {
      throw new BadRequestException(
        `Plan limit exceeded for ${capability}: ${result.projected}/${String(result.limit)}`
      );
    }
    return result;
  }

  isCapability(value: string | undefined): value is EntitlementCapability {
    return entitlementCapabilities.includes(value as EntitlementCapability);
  }
}
