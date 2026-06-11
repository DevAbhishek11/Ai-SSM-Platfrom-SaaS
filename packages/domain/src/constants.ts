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

export const contentTemplateCategories = [
  "product_launch",
  "announcement",
  "educational",
  "promotional",
  "crisis_response",
  "ugc",
  "evergreen"
] as const;
export type ContentTemplateCategory = (typeof contentTemplateCategories)[number];

export const contentTemplateStatuses = ["draft", "active", "archived"] as const;
export type ContentTemplateStatus = (typeof contentTemplateStatuses)[number];

export const scheduleRuleStatuses = ["active", "paused", "archived"] as const;
export type ScheduleRuleStatus = (typeof scheduleRuleStatuses)[number];

export const scheduleSlotStatuses = ["recommended", "reserved", "used", "skipped"] as const;
export type ScheduleSlotStatus = (typeof scheduleSlotStatuses)[number];

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

export const campaignMilestoneStatuses = ["pending", "at_risk", "completed"] as const;
export type CampaignMilestoneStatus = (typeof campaignMilestoneStatuses)[number];

export const campaignTaskStatuses = ["todo", "in_progress", "blocked", "done"] as const;
export type CampaignTaskStatus = (typeof campaignTaskStatuses)[number];

export const campaignTaskPriorities = ["low", "normal", "high", "urgent"] as const;
export type CampaignTaskPriority = (typeof campaignTaskPriorities)[number];

export const campaignReportStatuses = ["draft", "generated", "shared"] as const;
export type CampaignReportStatus = (typeof campaignReportStatuses)[number];

export const accountStatuses = ["connected", "expired", "revoked", "error"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const invitationStatuses = ["pending", "accepted", "revoked", "expired"] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

export const apiKeyStatuses = ["active", "revoked", "expired"] as const;
export type ApiKeyStatus = (typeof apiKeyStatuses)[number];

export const socialOAuthStateStatuses = ["pending", "consumed", "expired", "failed"] as const;
export type SocialOAuthStateStatus = (typeof socialOAuthStateStatuses)[number];

export const connectorEventSeverities = ["info", "warning", "critical"] as const;
export type ConnectorEventSeverity = (typeof connectorEventSeverities)[number];

export const sentimentLabels = ["negative", "neutral", "positive", "mixed"] as const;
export type SentimentLabel = (typeof sentimentLabels)[number];

export const listeningMonitorTypes = ["brand", "keyword", "hashtag", "competitor", "influencer"] as const;
export type ListeningMonitorType = (typeof listeningMonitorTypes)[number];

export const listeningMonitorStatuses = ["active", "paused", "archived"] as const;
export type ListeningMonitorStatus = (typeof listeningMonitorStatuses)[number];

export const listeningAlertSeverities = ["info", "warning", "critical"] as const;
export type ListeningAlertSeverity = (typeof listeningAlertSeverities)[number];

export const mediaAssetTypes = ["image", "video", "audio", "document", "design", "three_d"] as const;
export type MediaAssetType = (typeof mediaAssetTypes)[number];

export const mediaProcessingJobStatuses = [
  "queued",
  "virus_scanning",
  "format_detecting",
  "optimizing",
  "thumbnailing",
  "ai_tagging",
  "storing",
  "cdn_distributing",
  "completed",
  "failed"
] as const;
export type MediaProcessingJobStatus = (typeof mediaProcessingJobStatuses)[number];

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

export const notificationChannels = [
  "in_app",
  "email",
  "push",
  "slack",
  "teams",
  "sms",
  "webhook"
] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

export const notificationDeliveryStatuses = ["pending", "sent", "failed", "suppressed"] as const;
export type NotificationDeliveryStatus = (typeof notificationDeliveryStatuses)[number];

export const safetyPolicyStatuses = ["draft", "active", "archived"] as const;
export type SafetyPolicyStatus = (typeof safetyPolicyStatuses)[number];

export const contentSafetyStatuses = ["passed", "flagged", "blocked"] as const;
export type ContentSafetyStatus = (typeof contentSafetyStatuses)[number];

export const safetySeverities = ["low", "medium", "high", "critical"] as const;
export type SafetySeverity = (typeof safetySeverities)[number];

export const moderationStatuses = ["open", "approved", "rejected", "resolved"] as const;
export type ModerationStatus = (typeof moderationStatuses)[number];

export const reportTypes = ["campaign", "analytics", "listening", "executive"] as const;
export type ReportType = (typeof reportTypes)[number];

export const reportFormats = ["pdf", "csv", "xlsx", "json"] as const;
export type ReportFormat = (typeof reportFormats)[number];

export const reportScheduleFrequencies = ["daily", "weekly", "monthly"] as const;
export type ReportScheduleFrequency = (typeof reportScheduleFrequencies)[number];

export const reportExportStatuses = ["queued", "processing", "ready", "failed", "expired"] as const;
export type ReportExportStatus = (typeof reportExportStatuses)[number];

export const reportShareLinkStatuses = ["active", "revoked", "expired"] as const;
export type ReportShareLinkStatus = (typeof reportShareLinkStatuses)[number];

export const ssoProviderTypes = ["saml", "oidc", "google_workspace", "azure_ad", "okta"] as const;
export type SsoProviderType = (typeof ssoProviderTypes)[number];

export const ssoConnectionStatuses = ["draft", "active", "disabled", "error"] as const;
export type SsoConnectionStatus = (typeof ssoConnectionStatuses)[number];

export const authSessionStatuses = ["active", "revoked", "expired"] as const;
export type AuthSessionStatus = (typeof authSessionStatuses)[number];

export const trustedDeviceStatuses = ["trusted", "pending", "revoked"] as const;
export type TrustedDeviceStatus = (typeof trustedDeviceStatuses)[number];

export const notificationDigestFrequencies = ["instant", "daily", "weekly", "muted"] as const;
export type NotificationDigestFrequency = (typeof notificationDigestFrequencies)[number];

export const webhookStatuses = ["pending", "delivered", "failed"] as const;
export type WebhookStatus = (typeof webhookStatuses)[number];

export const webhookEndpointStatuses = ["active", "disabled", "failing"] as const;
export type WebhookEndpointStatus = (typeof webhookEndpointStatuses)[number];

export const publishingJobStatuses = [
  "queued",
  "processing",
  "retrying",
  "succeeded",
  "failed",
  "canceled"
] as const;
export type PublishingJobStatus = (typeof publishingJobStatuses)[number];

export const workflowEventActions = [
  "created",
  "submitted_for_review",
  "approved",
  "changes_requested",
  "scheduled",
  "publishing_started",
  "published",
  "failed",
  "canceled",
  "archived",
  "commented"
] as const;
export type WorkflowEventAction = (typeof workflowEventActions)[number];

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
