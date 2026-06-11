import { z } from "zod";
import {
  accountStatuses,
  campaignTypes,
  mediaProcessingJobStatuses,
  mediaAssetTypes,
  notificationTypes,
  platforms,
  plans,
  postStatuses,
  roles,
  sentimentLabels,
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
    flags: z.array(z.string())
  }),
  variants: z.array(postContentVariantSchema),
  qualityScore: z.number().min(0).max(100),
  estimatedTokens: z.number().int().nonnegative()
});

export type User = z.infer<typeof userSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type SocialAccount = z.infer<typeof socialAccountSchema>;
export type Post = z.infer<typeof postSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type AnalyticsSnapshot = z.infer<typeof analyticsSnapshotSchema>;
export type Trend = z.infer<typeof trendSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type MediaProcessingJob = z.infer<typeof mediaProcessingJobSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;
export type PublishingJob = z.infer<typeof publishingJobSchema>;
export type PostComment = z.infer<typeof postCommentSchema>;
export type WorkflowEvent = z.infer<typeof workflowEventSchema>;
export type AiGenerationRequest = z.infer<typeof aiGenerationRequestSchema>;
export type AiGenerationResponse = z.infer<typeof aiGenerationResponseSchema>;
