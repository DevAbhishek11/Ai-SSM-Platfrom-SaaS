export const roles = [
  "super_admin",
  "owner",
  "admin",
  "manager",
  "creator",
  "reviewer",
  "viewer",
  "api_service_account"
] as const;

export type Role = (typeof roles)[number];

export const plans = ["free", "starter", "pro", "business", "enterprise"] as const;
export type Plan = (typeof plans)[number];

export const platforms = [
  "x",
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "tiktok",
  "reddit",
  "pinterest",
  "threads",
  "mastodon",
  "bluesky"
] as const;

export type Platform = (typeof platforms)[number];

export const postStatuses = [
  "draft",
  "in_review",
  "revisions_needed",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "archived"
] as const;

export type PostStatus = (typeof postStatuses)[number];

export const campaignTypes = [
  "product_launch",
  "seasonal",
  "evergreen",
  "community",
  "crisis",
  "ab_test",
  "influencer",
  "paid"
] as const;

export type CampaignType = (typeof campaignTypes)[number];

export const accountStatuses = ["connected", "expired", "revoked", "error"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const sentimentLabels = ["negative", "neutral", "positive", "mixed"] as const;
export type SentimentLabel = (typeof sentimentLabels)[number];

export const mediaAssetTypes = ["image", "video", "audio", "document", "design", "three_d"] as const;
export type MediaAssetType = (typeof mediaAssetTypes)[number];

export const notificationTypes = [
  "publishing_failure",
  "approval_request",
  "trend_alert",
  "performance_milestone",
  "account_issue",
  "system_alert",
  "billing_alert",
  "security_alert",
  "mention",
  "scheduled_reminder"
] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const webhookStatuses = ["pending", "delivered", "failed"] as const;
export type WebhookStatus = (typeof webhookStatuses)[number];

export const planLimits: Record<
  Plan,
  {
    workspaces: number | "unlimited";
    socialAccounts: number | "unlimited";
    postsPerMonth: number | "unlimited";
    aiGenerations: number | "custom";
    teamMembers: number | "unlimited";
    mediaStorageGb: number | "custom";
    apiAccess: "none" | "read" | "full" | "full_with_webhooks";
    sso: boolean;
    whiteLabel: boolean;
  }
> = {
  free: {
    workspaces: 1,
    socialAccounts: 3,
    postsPerMonth: 30,
    aiGenerations: 10,
    teamMembers: 1,
    mediaStorageGb: 1,
    apiAccess: "none",
    sso: false,
    whiteLabel: false
  },
  starter: {
    workspaces: 1,
    socialAccounts: 5,
    postsPerMonth: 100,
    aiGenerations: 50,
    teamMembers: 3,
    mediaStorageGb: 10,
    apiAccess: "none",
    sso: false,
    whiteLabel: false
  },
  pro: {
    workspaces: 3,
    socialAccounts: 15,
    postsPerMonth: 500,
    aiGenerations: 200,
    teamMembers: 10,
    mediaStorageGb: 50,
    apiAccess: "read",
    sso: false,
    whiteLabel: false
  },
  business: {
    workspaces: 10,
    socialAccounts: 50,
    postsPerMonth: 2000,
    aiGenerations: 1000,
    teamMembers: 25,
    mediaStorageGb: 200,
    apiAccess: "full",
    sso: true,
    whiteLabel: false
  },
  enterprise: {
    workspaces: "unlimited",
    socialAccounts: "unlimited",
    postsPerMonth: "unlimited",
    aiGenerations: "custom",
    teamMembers: "unlimited",
    mediaStorageGb: "custom",
    apiAccess: "full_with_webhooks",
    sso: true,
    whiteLabel: true
  }
};

export const supportedPlatformCapabilities: Record<
  Platform,
  {
    posting: boolean;
    scheduling: boolean;
    analytics: boolean;
    stories: boolean;
    shortVideo: boolean;
    dms: boolean;
    comments: boolean;
    maxCharacters: number;
  }
> = {
  x: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: false,
    shortVideo: false,
    dms: true,
    comments: true,
    maxCharacters: 280
  },
  instagram: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: true,
    shortVideo: true,
    dms: true,
    comments: true,
    maxCharacters: 2200
  },
  facebook: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: true,
    shortVideo: true,
    dms: true,
    comments: true,
    maxCharacters: 63206
  },
  linkedin: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: false,
    shortVideo: false,
    dms: true,
    comments: true,
    maxCharacters: 3000
  },
  youtube: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: false,
    shortVideo: true,
    dms: false,
    comments: true,
    maxCharacters: 5000
  },
  tiktok: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: false,
    shortVideo: true,
    dms: false,
    comments: true,
    maxCharacters: 2200
  },
  reddit: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: false,
    shortVideo: false,
    dms: false,
    comments: true,
    maxCharacters: 40000
  },
  pinterest: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: false,
    shortVideo: false,
    dms: false,
    comments: false,
    maxCharacters: 500
  },
  threads: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: false,
    shortVideo: false,
    dms: false,
    comments: true,
    maxCharacters: 500
  },
  mastodon: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: false,
    shortVideo: false,
    dms: false,
    comments: true,
    maxCharacters: 500
  },
  bluesky: {
    posting: true,
    scheduling: true,
    analytics: true,
    stories: false,
    shortVideo: false,
    dms: false,
    comments: true,
    maxCharacters: 300
  }
};
