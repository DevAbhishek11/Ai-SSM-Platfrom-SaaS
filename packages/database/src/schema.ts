import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import {
  accountStatuses,
  campaignTypes,
  mediaProcessingJobStatuses,
  platforms,
  plans,
  postStatuses,
  publishingJobStatuses,
  roles,
  sentimentLabels,
  webhookEndpointStatuses
} from "@ssm/domain";

export const roleEnum = pgEnum("role", roles);
export const planEnum = pgEnum("plan", plans);
export const platformEnum = pgEnum("platform", platforms);
export const postStatusEnum = pgEnum("post_status", postStatuses);
export const accountStatusEnum = pgEnum("account_status", accountStatuses);
export const mediaProcessingJobStatusEnum = pgEnum(
  "media_processing_job_status",
  mediaProcessingJobStatuses
);
export const campaignTypeEnum = pgEnum("campaign_type", campaignTypes);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "planning",
  "active",
  "paused",
  "completed",
  "archived"
]);
export const memberStatusEnum = pgEnum("member_status", ["active", "invited", "suspended"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "deleted"]);
export const sentimentEnum = pgEnum("sentiment", sentimentLabels);
export const webhookStatusEnum = pgEnum("webhook_status", ["pending", "delivered", "failed"]);
export const webhookEndpointStatusEnum = pgEnum("webhook_endpoint_status", webhookEndpointStatuses);
export const publishingJobStatusEnum = pgEnum("publishing_job_status", publishingJobStatuses);
export const workflowEventActionEnum = pgEnum("workflow_event_action", [
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
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    mfaSecret: text("mfa_secret"),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    timezone: text("timezone").default("UTC").notNull(),
    language: text("language").default("en").notNull(),
    status: userStatusEnum("status").default("active").notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
    statusIdx: index("users_status_idx").on(table.status)
  })
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: planEnum("plan").default("free").notNull(),
    billingEmail: text("billing_email").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps
  },
  (table) => ({
    slugUnique: uniqueIndex("organizations_slug_unique").on(table.slug),
    planIdx: index("organizations_plan_idx").on(table.plan)
  })
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    branding: jsonb("branding").$type<Record<string, unknown>>().default({}).notNull(),
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps
  },
  (table) => ({
    orgSlugUnique: uniqueIndex("workspaces_organization_slug_unique").on(
      table.organizationId,
      table.slug
    ),
    organizationIdx: index("workspaces_organization_idx").on(table.organizationId)
  })
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    status: memberStatusEnum("status").default("invited").notNull(),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
  },
  (table) => ({
    membershipUnique: uniqueIndex("team_members_user_workspace_unique").on(
      table.userId,
      table.workspaceId
    ),
    workspaceRoleIdx: index("team_members_workspace_role_idx").on(table.workspaceId, table.role)
  })
);

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    platformUserId: text("platform_user_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    profileImageUrl: text("profile_image_url"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    permissions: jsonb("permissions").$type<Record<string, unknown>>().default({}).notNull(),
    status: accountStatusEnum("status").default("connected").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    platformIdentityUnique: uniqueIndex("social_accounts_platform_identity_unique").on(
      table.workspaceId,
      table.platform,
      table.platformUserId
    ),
    workspaceStatusIdx: index("social_accounts_workspace_status_idx").on(
      table.workspaceId,
      table.status
    )
  })
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: campaignTypeEnum("type").notNull(),
    status: campaignStatusEnum("status").default("planning").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    budget: numeric("budget", { precision: 14, scale: 2 }),
    objectives: jsonb("objectives").$type<string[]>().default([]).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => ({
    workspaceStatusIdx: index("campaigns_workspace_status_idx").on(table.workspaceId, table.status),
    workspaceDatesIdx: index("campaigns_workspace_dates_idx").on(table.workspaceId, table.startDate)
  })
);

export const brandVoices = pgTable(
  "brand_voices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tone: jsonb("tone").$type<Record<string, unknown>>().default({}).notNull(),
    style: jsonb("style").$type<Record<string, unknown>>().default({}).notNull(),
    vocabulary: jsonb("vocabulary").$type<Record<string, unknown>>().default({}).notNull(),
    emojiUsage: text("emoji_usage").default("moderate").notNull(),
    ctaPreferences: jsonb("cta_preferences").$type<Record<string, unknown>>().default({}).notNull(),
    examples: jsonb("examples").$type<unknown[]>().default([]).notNull(),
    version: integer("version").default(1).notNull(),
    ...timestamps
  },
  (table) => ({
    workspaceNameUnique: uniqueIndex("brand_voices_workspace_name_unique").on(
      table.workspaceId,
      table.name
    )
  })
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").notNull(),
    storageKey: text("storage_key").notNull(),
    cdnUrl: text("cdn_url"),
    thumbnailUrl: text("thumbnail_url"),
    tags: text("tags").array().default(sql`ARRAY[]::text[]`).notNull(),
    folderId: uuid("folder_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    aiTags: jsonb("ai_tags").$type<Record<string, unknown>>().default({}).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    storageKeyUnique: uniqueIndex("media_assets_storage_key_unique").on(table.storageKey),
    workspaceTypeIdx: index("media_assets_workspace_type_idx").on(table.workspaceId, table.fileType)
  })
);

export const mediaProcessingJobs = pgTable(
  "media_processing_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    uploadIntentId: uuid("upload_intent_id").notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").notNull(),
    storageKey: text("storage_key").notNull(),
    status: mediaProcessingJobStatusEnum("status").default("queued").notNull(),
    currentStep: text("current_step").default("queued").notNull(),
    progress: integer("progress").default(0).notNull(),
    checksumSha256: text("checksum_sha256"),
    virusScan: jsonb("virus_scan").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    ...timestamps
  },
  (table) => ({
    workspaceStatusIdx: index("media_processing_jobs_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
    uploadIntentUnique: uniqueIndex("media_processing_jobs_upload_intent_unique").on(
      table.uploadIntentId
    ),
    assetIdx: index("media_processing_jobs_asset_idx").on(table.assetId)
  })
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    status: postStatusEnum("status").default("draft").notNull(),
    content: jsonb("content").$type<unknown[]>().notNull(),
    mediaIds: uuid("media_ids").array().default(sql`ARRAY[]::uuid[]`).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    aiModelUsed: text("ai_model_used"),
    aiPrompt: text("ai_prompt"),
    brandVoiceId: uuid("brand_voice_id").references(() => brandVoices.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => ({
    workspaceStatusIdx: index("posts_workspace_status_idx").on(table.workspaceId, table.status),
    workspaceScheduledIdx: index("posts_workspace_scheduled_idx").on(
      table.workspaceId,
      table.scheduledAt
    ),
    campaignIdx: index("posts_campaign_idx").on(table.campaignId)
  })
);

export const postPlatforms = pgTable(
  "post_platforms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    platformSpecificContent: jsonb("platform_specific_content")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    platformPostId: text("platform_post_id"),
    platformPostUrl: text("platform_post_url"),
    status: postStatusEnum("status").default("draft").notNull(),
    errorMessage: text("error_message"),
    publishedAt: timestamp("published_at", { withTimezone: true })
  },
  (table) => ({
    postAccountUnique: uniqueIndex("post_platforms_post_account_unique").on(
      table.postId,
      table.socialAccountId
    ),
    accountStatusIdx: index("post_platforms_account_status_idx").on(
      table.socialAccountId,
      table.status
    )
  })
);

export const analyticsSnapshots = pgTable(
  "analytics_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id").references(() => socialAccounts.id, {
      onDelete: "set null"
    }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
    snapshotDate: date("snapshot_date").notNull(),
    metrics: jsonb("metrics").$type<Record<string, number>>().notNull(),
    platform: platformEnum("platform").notNull()
  },
  (table) => ({
    workspaceDateIdx: index("analytics_snapshots_workspace_date_idx").on(
      table.workspaceId,
      table.snapshotDate
    ),
    accountDateIdx: index("analytics_snapshots_account_date_idx").on(
      table.socialAccountId,
      table.snapshotDate
    )
  })
);

export const trends = pgTable(
  "trends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    hashtag: text("hashtag"),
    source: text("source").notNull(),
    volume: integer("volume").default(0).notNull(),
    opportunityScore: integer("opportunity_score").default(0).notNull(),
    sentiment: sentimentEnum("sentiment").default("neutral").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    workspaceOpportunityIdx: index("trends_workspace_opportunity_idx").on(
      table.workspaceId,
      table.opportunityScore
    ),
    expiresAtIdx: index("trends_expires_at_idx").on(table.expiresAt)
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userReadIdx: index("notifications_user_read_idx").on(table.userId, table.read),
    userCreatedIdx: index("notifications_user_created_idx").on(table.userId, table.createdAt)
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
    newValues: jsonb("new_values").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    workspaceCreatedIdx: index("audit_logs_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId)
  })
);

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    modelUsed: text("model_used").notNull(),
    prompt: text("prompt").notNull(),
    output: jsonb("output").$type<Record<string, unknown>>().notNull(),
    tokensUsed: integer("tokens_used").default(0).notNull(),
    cost: numeric("cost", { precision: 12, scale: 6 }).default("0").notNull(),
    qualityScore: integer("quality_score"),
    userFeedback: text("user_feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    workspaceCreatedIdx: index("ai_generations_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    )
  })
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: webhookStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    responseCode: integer("response_code"),
    responseBody: text("response_body"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    workspaceStatusIdx: index("webhook_deliveries_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
    retryIdx: index("webhook_deliveries_retry_idx").on(table.nextRetryAt)
  })
);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    description: text("description"),
    events: text("events").array().default(sql`ARRAY[]::text[]`).notNull(),
    secretHash: text("secret_hash").notNull(),
    status: webhookEndpointStatusEnum("status").default("active").notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    lastDeliveredAt: timestamp("last_delivered_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    workspaceStatusIdx: index("webhook_endpoints_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
    workspaceUrlUnique: uniqueIndex("webhook_endpoints_workspace_url_unique").on(
      table.workspaceId,
      table.url
    )
  })
);

export const publishingJobs = pgTable(
  "publishing_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    status: publishingJobStatusEnum("status").default("queued").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    lastError: text("last_error"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    platformPostId: text("platform_post_id"),
    platformPostUrl: text("platform_post_url"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    idempotencyUnique: uniqueIndex("publishing_jobs_idempotency_unique").on(table.idempotencyKey),
    workspaceStatusScheduledIdx: index("publishing_jobs_workspace_status_scheduled_idx").on(
      table.workspaceId,
      table.status,
      table.scheduledFor
    ),
    retryIdx: index("publishing_jobs_retry_idx").on(table.status, table.nextRetryAt),
    postIdx: index("publishing_jobs_post_idx").on(table.postId)
  })
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    resolved: boolean("resolved").default(false).notNull(),
    ...timestamps
  },
  (table) => ({
    postCreatedIdx: index("post_comments_post_created_idx").on(table.postId, table.createdAt),
    workspaceResolvedIdx: index("post_comments_workspace_resolved_idx").on(
      table.workspaceId,
      table.resolved
    )
  })
);

export const workflowEvents = pgTable(
  "workflow_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: workflowEventActionEnum("action").notNull(),
    fromStatus: postStatusEnum("from_status"),
    toStatus: postStatusEnum("to_status"),
    comment: text("comment"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    postCreatedIdx: index("workflow_events_post_created_idx").on(table.postId, table.createdAt),
    workspaceActionIdx: index("workflow_events_workspace_action_idx").on(
      table.workspaceId,
      table.action
    )
  })
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  workspaces: many(workspaces)
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workspaces.organizationId],
    references: [organizations.id]
  }),
  members: many(teamMembers),
  socialAccounts: many(socialAccounts),
  campaigns: many(campaigns),
  posts: many(posts)
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [posts.workspaceId], references: [workspaces.id] }),
  campaign: one(campaigns, { fields: [posts.campaignId], references: [campaigns.id] }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  platformTargets: many(postPlatforms),
  publishingJobs: many(publishingJobs),
  comments: many(postComments),
  workflowEvents: many(workflowEvents)
}));

export const publishingJobsRelations = relations(publishingJobs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [publishingJobs.workspaceId],
    references: [workspaces.id]
  }),
  post: one(posts, { fields: [publishingJobs.postId], references: [posts.id] }),
  socialAccount: one(socialAccounts, {
    fields: [publishingJobs.socialAccountId],
    references: [socialAccounts.id]
  })
}));
