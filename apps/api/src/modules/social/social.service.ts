import { Injectable } from "@nestjs/common";
import { demoSocialAccounts, supportedPlatformCapabilities } from "@ssm/domain";

@Injectable()
export class SocialService {
  listAccounts(workspaceId: string) {
    return demoSocialAccounts.filter((account) => account.workspaceId === workspaceId);
  }

  getAccountHealth(workspaceId: string) {
    const accounts = this.listAccounts(workspaceId);
    const connected = accounts.filter((account) => account.status === "connected").length;
    const needsAttention = accounts.length - connected;

    return {
      total: accounts.length,
      connected,
      needsAttention,
      accounts: accounts.map((account) => ({
        id: account.id,
        platform: account.platform,
        username: account.username,
        status: account.status,
        lastSyncedAt: account.lastSyncedAt,
        actionRequired:
          account.status === "connected" ? null : "Reconnect account to refresh OAuth permissions."
      }))
    };
  }

  platformCapabilities() {
    return supportedPlatformCapabilities;
  }
}
