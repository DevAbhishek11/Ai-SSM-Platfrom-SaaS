import { z } from "zod";
import {
  accountStatuses,
  campaignTypes,
  platforms,
  plans,
  postStatuses,
  roles,
  sentimentLabels
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
export type AiGenerationRequest = z.infer<typeof aiGenerationRequestSchema>;
export type AiGenerationResponse = z.infer<typeof aiGenerationResponseSchema>;
