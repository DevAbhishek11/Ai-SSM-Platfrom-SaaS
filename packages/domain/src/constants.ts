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
