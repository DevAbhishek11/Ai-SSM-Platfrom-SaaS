import { z } from "zod";
import {
  accountStatuses,
  campaignMilestoneStatuses,
  campaignReportStatuses,
  campaignTaskPriorities,
  campaignTaskStatuses,
  apiKeyStatuses,
  campaignTypes,
  connectorEventSeverities,
  invitationStatuses,
  listeningAlertSeverities,
  listeningMonitorStatuses,
  listeningMonitorTypes,
  notificationChannels,
  notificationDeliveryStatuses,
  notificationDigestFrequencies,
  mediaProcessingJobStatuses,
  mediaAssetTypes,
  notificationTypes,
  platforms,
  plans,
  postStatuses,
  reportExportStatuses,
  reportFormats,
  reportScheduleFrequencies,
  reportShareLinkStatuses,
  reportTypes,
  roles,
  contentSafetyStatuses,
  moderationStatuses,
  safetyPolicyStatuses,
  safetySeverities,
  sentimentLabels,
  socialOAuthStateStatuses,
  authSessionStatuses,
  ssoConnectionStatuses,
  ssoProviderTypes,
  trustedDeviceStatuses,
  publishingJobStatuses,
  webhookEndpointStatuses,
  webhookStatuses,
  workflowEventActions
} from "./constants.js";

export const idSchema = z.uuid();
export const isoDateTimeSchema = z.iso.datetime();

export const userSchema = z.object({
  id: idSchema,
  email: z.email(),
  name: z.string().min(1).max(160),
  avatarUrl: z.url().optional(),
  timezone: z.string().default("UTC"),
  language: z.string().default("en"),
  status: z.enum(["active", "suspended", "deleted"]),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const organizationSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  plan: z.enum(plans),
  billingEmail: z.email(),
  settings: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const workspaceSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  name: z.string().min(1).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  branding: z
    .object({
      logoUrl: z.url().optional(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
    })
    .default({ primaryColor: "#111827", accentColor: "#0f766e" }),
  settings: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const teamMemberSchema = z.object({
  id: idSchema,
  userId: idSchema,
  workspaceId: idSchema,
  role: z.enum(roles),
  status: z.enum(["active", "invited", "suspended"]),
  invitedAt: isoDateTimeSchema.optional(),
  joinedAt: isoDateTimeSchema.optional()
});

export const workspaceInvitationSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  email: z.email(),
  role: z.enum(roles),
  status: z.enum(invitationStatuses),
  tokenHash: z.string().min(16),
  invitedBy: idSchema,
  invitedAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  acceptedAt: isoDateTimeSchema.optional(),
  revokedAt: isoDateTimeSchema.optional()
});

export const apiKeySchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().min(1).max(160),
  keyPrefix: z.string().min(6).max(32),
  secretHash: z.string().min(16),
  scopes: z.array(z.string().min(1)).min(1),
  status: z.enum(apiKeyStatuses),
  createdBy: idSchema,
  createdAt: isoDateTimeSchema,
  lastUsedAt: isoDateTimeSchema.optional(),
  expiresAt: isoDateTimeSchema.optional(),
  revokedAt: isoDateTimeSchema.optional()
});

export const ssoConnectionSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  providerType: z.enum(ssoProviderTypes),
  status: z.enum(ssoConnectionStatuses),
  domain: z.string().min(1).max(180),
  entityId: z.string().min(1).max(500),
  ssoUrl: z.url(),
  certificateFingerprint: z.string().min(8),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdBy: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  lastTestedAt: isoDateTimeSchema.optional()
});

export const authSessionSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  userId: idSchema,
  status: z.enum(authSessionStatuses),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceId: idSchema.optional(),
  createdAt: isoDateTimeSchema,
  lastSeenAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  revokedAt: isoDateTimeSchema.optional()
});

export const trustedDeviceSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  userId: idSchema,
  name: z.string().min(1).max(180),
  fingerprint: z.string().min(8),
  status: z.enum(trustedDeviceStatuses),
  lastSeenAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  revokedAt: isoDateTimeSchema.optional()
});

export const socialAccountSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  platform: z.enum(platforms),
  platformUserId: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  profileImageUrl: z.url().optional(),
  permissions: z.record(z.string(), z.boolean()).default({}),
  status: z.enum(accountStatuses),
  lastSyncedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const socialOAuthStateSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  platform: z.enum(platforms),
  state: z.string().min(16),
  authorizationUrl: z.url(),
  redirectUri: z.url(),
  scopes: z.array(z.string().min(1)),
  status: z.enum(socialOAuthStateStatuses),
  expiresAt: isoDateTimeSchema,
  createdBy: idSchema,
  createdAt: isoDateTimeSchema,
  consumedAt: isoDateTimeSchema.optional()
});

export const socialRateLimitBucketSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  socialAccountId: idSchema,
  platform: z.enum(platforms),
  bucketKey: z.string().min(1),
  limit: z.number().int().positive(),
  remaining: z.number().int().nonnegative(),
  windowSeconds: z.number().int().positive(),
  resetAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const socialConnectorEventSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  socialAccountId: idSchema.optional(),
  platform: z.enum(platforms),
  type: z.string().min(1),
  severity: z.enum(connectorEventSeverities),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDateTimeSchema
});

export const postContentVariantSchema = z.object({
  platform: z.enum(platforms),
  text: z.string().min(1).max(65000),
  hashtags: z.array(z.string().min(1)).default([]),
  firstComment: z.string().optional(),
  link: z.url().optional()
});

export const postSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  campaignId: idSchema.optional(),
  authorId: idSchema,
  status: z.enum(postStatuses),
  content: z.array(postContentVariantSchema).min(1),
  mediaIds: z.array(idSchema).default([]),
  scheduledAt: isoDateTimeSchema.optional(),
  publishedAt: isoDateTimeSchema.optional(),
  aiGenerated: z.boolean().default(false),
  aiModelUsed: z.string().optional(),
  brandVoiceId: idSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const campaignSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().min(1).max(200),
  type: z.enum(campaignTypes),
  status: z.enum(["planning", "active", "paused", "completed", "archived"]),
  startDate: z.iso.date(),
  endDate: z.iso.date().optional(),
  budget: z.number().nonnegative().optional(),
  objectives: z.array(z.string()).default([]),
  createdBy: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const campaignMilestoneSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  campaignId: idSchema,
  name: z.string().min(1).max(180),
  description: z.string().max(1000).optional(),
  dueDate: z.iso.date(),
  status: z.enum(campaignMilestoneStatuses),
  ownerId: idSchema.optional(),
  completedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const campaignTaskSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  campaignId: idSchema,
  title: z.string().min(1).max(240),
  status: z.enum(campaignTaskStatuses),
  priority: z.enum(campaignTaskPriorities),
  assigneeId: idSchema.optional(),
  dueDate: z.iso.date().optional(),
  completedAt: isoDateTimeSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const campaignBudgetLineSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  campaignId: idSchema,
  category: z.string().min(1).max(120),
  allocated: z.number().nonnegative(),
  spent: z.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const campaignReportSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  campaignId: idSchema,
  title: z.string().min(1).max(180),
  status: z.enum(campaignReportStatuses),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  metrics: z.object({
    posts: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    scheduled: z.number().int().nonnegative(),
    impressions: z.number().int().nonnegative(),
    engagements: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative(),
    spend: z.number().nonnegative(),
    roi: z.number(),
    engagementRate: z.number().nonnegative()
  }),
  insights: z.array(z.string()).default([]),
  generatedAt: isoDateTimeSchema,
  sharedAt: isoDateTimeSchema.optional()
});

export const reportTemplateSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().min(1).max(180),
  type: z.enum(reportTypes),
  format: z.enum(reportFormats),
  filters: z.record(z.string(), z.unknown()).default({}),
  branding: z
    .object({
      logoUrl: z.url().optional(),
      primaryColor: z.string().min(1).default("#0f766e"),
      footerText: z.string().max(240).optional()
    })
    .default({ primaryColor: "#0f766e" }),
  createdBy: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const scheduledReportSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  templateId: idSchema,
  frequency: z.enum(reportScheduleFrequencies),
  recipients: z.array(z.email()).default([]),
  nextRunAt: isoDateTimeSchema,
  lastRunAt: isoDateTimeSchema.optional(),
  active: z.boolean(),
  createdBy: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const reportExportSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  templateId: idSchema.optional(),
  type: z.enum(reportTypes),
  format: z.enum(reportFormats),
  status: z.enum(reportExportStatuses),
  downloadUrl: z.url().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  requestedBy: idSchema,
  createdAt: isoDateTimeSchema,
  readyAt: isoDateTimeSchema.optional(),
  expiresAt: isoDateTimeSchema.optional()
});

export const reportShareLinkSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  exportId: idSchema,
  token: z.string().min(16),
  status: z.enum(reportShareLinkStatuses),
  expiresAt: isoDateTimeSchema,
  createdBy: idSchema,
  createdAt: isoDateTimeSchema,
  revokedAt: isoDateTimeSchema.optional()
});

export const brandVoiceSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().min(1).max(160),
  tone: z.record(z.string(), z.unknown()).default({}),
  style: z.record(z.string(), z.unknown()).default({}),
  vocabulary: z
    .object({
      preferredTerms: z.array(z.string()).default([]),
      bannedTerms: z.array(z.string()).default([]),
      industryTerms: z.array(z.string()).default([])
    })
    .default({ preferredTerms: [], bannedTerms: [], industryTerms: [] }),
  emojiUsage: z.enum(["none", "light", "moderate", "expressive"]),
  ctaPreferences: z.record(z.string(), z.unknown()).default({}),
  examples: z.array(z.string().min(1)).default([]),
  version: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const analyticsSnapshotSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  socialAccountId: idSchema.optional(),
  postId: idSchema.optional(),
  snapshotDate: z.iso.date(),
  platform: z.enum(platforms),
  metrics: z.object({
    impressions: z.number().int().nonnegative(),
    reach: z.number().int().nonnegative(),
    engagements: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative()
  })
});

export const trendSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  keyword: z.string().min(1),
  hashtag: z.string().optional(),
  source: z.string().min(1),
  volume: z.number().int().nonnegative(),
  opportunityScore: z.number().min(0).max(100),
  sentiment: z.enum(sentimentLabels),
  detectedAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema
});

export const listeningMonitorSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  type: z.enum(listeningMonitorTypes),
  query: z.string().min(1).max(240),
  platforms: z.array(z.enum(platforms)).default([]),
  status: z.enum(listeningMonitorStatuses),
  alertThreshold: z.number().min(0).max(100).default(75),
  createdBy: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const socialMentionSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  monitorId: idSchema,
  platform: z.enum(platforms),
  author: z.string().min(1),
  content: z.string().min(1).max(5000),
  url: z.url().optional(),
  sentiment: z.enum(sentimentLabels),
  reach: z.number().int().nonnegative(),
  engagement: z.number().int().nonnegative(),
  detectedAt: isoDateTimeSchema,
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const listeningAlertSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  monitorId: idSchema,
  mentionId: idSchema.optional(),
  severity: z.enum(listeningAlertSeverities),
  title: z.string().min(1).max(180),
  body: z.string().min(1).max(2000),
  resolved: z.boolean(),
  createdAt: isoDateTimeSchema,
  resolvedAt: isoDateTimeSchema.optional()
});

export const mediaAssetSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  fileName: z.string().min(1).max(255),
  assetType: z.enum(mediaAssetTypes),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  storageKey: z.string().min(1),
  cdnUrl: z.url().optional(),
  thumbnailUrl: z.url().optional(),
  tags: z.array(z.string()).default([]),
  folderId: idSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  aiTags: z.record(z.string(), z.unknown()).default({}),
  createdBy: idSchema,
  createdAt: isoDateTimeSchema
});

export const mediaProcessingJobSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  assetId: idSchema.optional(),
  uploadIntentId: idSchema,
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  storageKey: z.string().min(1),
  status: z.enum(mediaProcessingJobStatuses),
  currentStep: z.string().min(1),
  progress: z.number().min(0).max(100),
  checksumSha256: z.string().optional(),
  virusScan: z
    .object({
      status: z.enum(["pending", "clean", "infected", "error"]),
      engine: z.string(),
      scannedAt: isoDateTimeSchema.optional()
    })
    .optional(),
  output: z
    .object({
      cdnUrl: z.url().optional(),
      thumbnailUrl: z.url().optional(),
      optimizedBytes: z.number().int().nonnegative().optional(),
      tags: z.array(z.string()).default([])
    })
    .optional(),
  errorMessage: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const notificationSchema = z.object({
  id: idSchema,
  userId: idSchema,
  type: z.enum(notificationTypes),
  title: z.string().min(1).max(180),
  body: z.string().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).default({}),
  read: z.boolean(),
  createdAt: isoDateTimeSchema
});

export const notificationPreferenceSchema = z.object({
  id: idSchema,
  userId: idSchema,
  workspaceId: idSchema,
  channelSettings: z.record(z.string(), z.boolean()).default({}),
  digestFrequency: z.enum(notificationDigestFrequencies),
  quietHours: z
    .object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      timezone: z.string().min(1)
    })
    .optional(),
  mutedTypes: z.array(z.enum(notificationTypes)).default([]),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const notificationDeliveryAttemptSchema = z.object({
  id: idSchema,
  notificationId: idSchema,
  workspaceId: idSchema,
  userId: idSchema,
  channel: z.enum(notificationChannels),
  status: z.enum(notificationDeliveryStatuses),
  provider: z.string().min(1),
  destination: z.string().min(1),
  errorMessage: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  attemptedAt: isoDateTimeSchema,
  deliveredAt: isoDateTimeSchema.optional()
});

export const safetyPolicySchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().min(1).max(180),
  status: z.enum(safetyPolicyStatuses),
  rules: z
    .object({
      blockedTerms: z.array(z.string()).default([]),
      requiredDisclosures: z.array(z.string()).default([]),
      industry: z.string().optional(),
      maxRiskScore: z.number().min(0).max(1).default(0.75)
    })
    .default({ blockedTerms: [], requiredDisclosures: [], maxRiskScore: 0.75 }),
  createdBy: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const contentSafetyCheckSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  policyId: idSchema.optional(),
  source: z.enum(["ai_generation", "manual", "post_review"]),
  sourceEntityId: idSchema.optional(),
  text: z.string().min(1).max(10000),
  status: z.enum(contentSafetyStatuses),
  severity: z.enum(safetySeverities),
  riskScore: z.number().min(0).max(1),
  flags: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  createdAt: isoDateTimeSchema
});

export const moderationQueueItemSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  safetyCheckId: idSchema,
  source: z.enum(["ai_generation", "manual", "post_review"]),
  sourceEntityId: idSchema.optional(),
  status: z.enum(moderationStatuses),
  reason: z.string().min(1).max(1000),
  assignedTo: idSchema.optional(),
  resolutionNote: z.string().max(2000).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const auditLogSchema = z.object({
  id: idSchema,
  workspaceId: idSchema.optional(),
  userId: idSchema.optional(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: idSchema.optional(),
  oldValues: z.record(z.string(), z.unknown()).optional(),
  newValues: z.record(z.string(), z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: isoDateTimeSchema
});

export const webhookDeliverySchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  eventType: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(webhookStatuses),
  attempts: z.number().int().nonnegative(),
  nextRetryAt: isoDateTimeSchema.optional(),
  responseCode: z.number().int().optional(),
  responseBody: z.string().optional(),
  createdAt: isoDateTimeSchema
});

export const webhookEndpointSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  url: z.url(),
  description: z.string().max(500).optional(),
  events: z.array(z.string().min(1)).min(1),
  secretHash: z.string().min(1),
  status: z.enum(webhookEndpointStatuses),
  failureCount: z.number().int().nonnegative(),
  lastDeliveredAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const publishingJobSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  postId: idSchema,
  socialAccountId: idSchema,
  platform: z.enum(platforms),
  status: z.enum(publishingJobStatuses),
  idempotencyKey: z.string().min(16),
  scheduledFor: isoDateTimeSchema,
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  lastError: z.string().optional(),
  nextRetryAt: isoDateTimeSchema.optional(),
  platformPostId: z.string().optional(),
  platformPostUrl: z.url().optional(),
  lockedAt: isoDateTimeSchema.optional(),
  completedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const postCommentSchema = z.object({
  id: idSchema,
  postId: idSchema,
  workspaceId: idSchema,
  authorId: idSchema,
  body: z.string().min(1).max(5000),
  resolved: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const workflowEventSchema = z.object({
  id: idSchema,
  postId: idSchema,
  workspaceId: idSchema,
  actorId: idSchema,
  action: z.enum(workflowEventActions),
  fromStatus: z.enum(postStatuses).optional(),
  toStatus: z.enum(postStatuses).optional(),
  comment: z.string().max(5000).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDateTimeSchema
});

export const aiGenerationRequestSchema = z.object({
  workspaceId: idSchema,
  brief: z.string().min(10).max(5000),
  platforms: z.array(z.enum(platforms)).min(1),
  tone: z.string().min(2).max(80).default("professional"),
  objective: z.string().min(2).max(120).default("engagement"),
  brandVoiceId: idSchema.optional()
});

export const aiGenerationResponseSchema = z.object({
  id: idSchema,
  modelUsed: z.string(),
  safety: z.object({
    blocked: z.boolean(),
    riskScore: z.number().min(0).max(1),
    flags: z.array(z.string()),
    recommendations: z.array(z.string()).default([]),
    checkId: idSchema.optional(),
    moderationItemId: idSchema.optional()
  }),
  variants: z.array(postContentVariantSchema),
  qualityScore: z.number().min(0).max(100),
  estimatedTokens: z.number().int().nonnegative()
});

export type User = z.infer<typeof userSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type WorkspaceInvitation = z.infer<typeof workspaceInvitationSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type SsoConnection = z.infer<typeof ssoConnectionSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type TrustedDevice = z.infer<typeof trustedDeviceSchema>;
export type SocialAccount = z.infer<typeof socialAccountSchema>;
export type SocialOAuthState = z.infer<typeof socialOAuthStateSchema>;
export type SocialRateLimitBucket = z.infer<typeof socialRateLimitBucketSchema>;
export type SocialConnectorEvent = z.infer<typeof socialConnectorEventSchema>;
export type Post = z.infer<typeof postSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type CampaignMilestone = z.infer<typeof campaignMilestoneSchema>;
export type CampaignTask = z.infer<typeof campaignTaskSchema>;
export type CampaignBudgetLine = z.infer<typeof campaignBudgetLineSchema>;
export type CampaignReport = z.infer<typeof campaignReportSchema>;
export type ReportTemplate = z.infer<typeof reportTemplateSchema>;
export type ScheduledReport = z.infer<typeof scheduledReportSchema>;
export type ReportExport = z.infer<typeof reportExportSchema>;
export type ReportShareLink = z.infer<typeof reportShareLinkSchema>;
export type BrandVoice = z.infer<typeof brandVoiceSchema>;
export type AnalyticsSnapshot = z.infer<typeof analyticsSnapshotSchema>;
export type Trend = z.infer<typeof trendSchema>;
export type ListeningMonitor = z.infer<typeof listeningMonitorSchema>;
export type SocialMention = z.infer<typeof socialMentionSchema>;
export type ListeningAlert = z.infer<typeof listeningAlertSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type MediaProcessingJob = z.infer<typeof mediaProcessingJobSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type NotificationDeliveryAttempt = z.infer<typeof notificationDeliveryAttemptSchema>;
export type SafetyPolicy = z.infer<typeof safetyPolicySchema>;
export type ContentSafetyCheck = z.infer<typeof contentSafetyCheckSchema>;
export type ModerationQueueItem = z.infer<typeof moderationQueueItemSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;
export type PublishingJob = z.infer<typeof publishingJobSchema>;
export type PostComment = z.infer<typeof postCommentSchema>;
export type WorkflowEvent = z.infer<typeof workflowEventSchema>;
export type AiGenerationRequest = z.infer<typeof aiGenerationRequestSchema>;
export type AiGenerationResponse = z.infer<typeof aiGenerationResponseSchema>;
