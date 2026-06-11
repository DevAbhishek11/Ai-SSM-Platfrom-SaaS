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
  apiKeyStatuses,
  campaignMilestoneStatuses,
  campaignReportStatuses,
  campaignTaskPriorities,
  campaignTaskStatuses,
  campaignTypes,
  connectorEventSeverities,
  invitationStatuses,
  listeningAlertSeverities,
  listeningMonitorStatuses,
  listeningMonitorTypes,
  notificationChannels,
  notificationDeliveryStatuses,
  notificationDigestFrequencies,
  contentSafetyStatuses,
  mediaProcessingJobStatuses,
  moderationStatuses,
  platforms,
  plans,
  postStatuses,
  publishingJobStatuses,
  reportExportStatuses,
  reportFormats,
  reportScheduleFrequencies,
  reportShareLinkStatuses,
  reportTypes,
  roles,
  safetyPolicyStatuses,
  safetySeverities,
  sentimentLabels,
  socialOAuthStateStatuses,
  authSessionStatuses,
  ssoConnectionStatuses,
  ssoProviderTypes,
  trustedDeviceStatuses,
  webhookEndpointStatuses
} from "@ssm/domain";

export const roleEnum = pgEnum("role", roles);
export const planEnum = pgEnum("plan", plans);
export const platformEnum = pgEnum("platform", platforms);
export const postStatusEnum = pgEnum("post_status", postStatuses);
export const accountStatusEnum = pgEnum("account_status", accountStatuses);
export const invitationStatusEnum = pgEnum("invitation_status", invitationStatuses);
export const apiKeyStatusEnum = pgEnum("api_key_status", apiKeyStatuses);
export const ssoProviderTypeEnum = pgEnum("sso_provider_type", ssoProviderTypes);
export const ssoConnectionStatusEnum = pgEnum("sso_connection_status", ssoConnectionStatuses);
export const authSessionStatusEnum = pgEnum("auth_session_status", authSessionStatuses);
export const trustedDeviceStatusEnum = pgEnum("trusted_device_status", trustedDeviceStatuses);
export const socialOAuthStateStatusEnum = pgEnum(
  "social_oauth_state_status",
  socialOAuthStateStatuses
);
export const connectorEventSeverityEnum = pgEnum(
  "connector_event_severity",
  connectorEventSeverities
);
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
export const campaignMilestoneStatusEnum = pgEnum(
  "campaign_milestone_status",
  campaignMilestoneStatuses
);
export const campaignTaskStatusEnum = pgEnum("campaign_task_status", campaignTaskStatuses);
export const campaignTaskPriorityEnum = pgEnum("campaign_task_priority", campaignTaskPriorities);
export const campaignReportStatusEnum = pgEnum("campaign_report_status", campaignReportStatuses);
export const reportTypeEnum = pgEnum("report_type", reportTypes);
export const reportFormatEnum = pgEnum("report_format", reportFormats);
export const reportScheduleFrequencyEnum = pgEnum(
  "report_schedule_frequency",
  reportScheduleFrequencies
);
export const reportExportStatusEnum = pgEnum("report_export_status", reportExportStatuses);
export const reportShareLinkStatusEnum = pgEnum(
  "report_share_link_status",
  reportShareLinkStatuses
);
export const memberStatusEnum = pgEnum("member_status", ["active", "invited", "suspended"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "deleted"]);
export const sentimentEnum = pgEnum("sentiment", sentimentLabels);
export const listeningMonitorTypeEnum = pgEnum("listening_monitor_type", listeningMonitorTypes);
export const listeningMonitorStatusEnum = pgEnum("listening_monitor_status", listeningMonitorStatuses);
export const listeningAlertSeverityEnum = pgEnum("listening_alert_severity", listeningAlertSeverities);
export const notificationChannelEnum = pgEnum("notification_channel", notificationChannels);
export const notificationDeliveryStatusEnum = pgEnum(
  "notification_delivery_status",
  notificationDeliveryStatuses
);
export const safetyPolicyStatusEnum = pgEnum("safety_policy_status", safetyPolicyStatuses);
export const contentSafetyStatusEnum = pgEnum("content_safety_status", contentSafetyStatuses);
export const safetySeverityEnum = pgEnum("safety_severity", safetySeverities);
export const moderationStatusEnum = pgEnum("moderation_status", moderationStatuses);
export const notificationDigestFrequencyEnum = pgEnum(
  "notification_digest_frequency",
  notificationDigestFrequencies
);
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

export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").notNull(),
    status: invitationStatusEnum("status").default("pending").notNull(),
    tokenHash: text("token_hash").notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => ({
    workspaceEmailStatusIdx: index("workspace_invitations_email_status_idx").on(
      table.workspaceId,
      table.email,
      table.status
    ),
    tokenHashUnique: uniqueIndex("workspace_invitations_token_hash_unique").on(table.tokenHash)
  })
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    secretHash: text("secret_hash").notNull(),
    scopes: text("scopes").array().default(sql`ARRAY[]::text[]`).notNull(),
    status: apiKeyStatusEnum("status").default("active").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => ({
    workspaceStatusIdx: index("api_keys_workspace_status_idx").on(table.workspaceId, table.status),
    keyPrefixUnique: uniqueIndex("api_keys_key_prefix_unique").on(table.keyPrefix)
  })
);

export const ssoConnections = pgTable(
  "sso_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    providerType: ssoProviderTypeEnum("provider_type").notNull(),
    status: ssoConnectionStatusEnum("status").default("draft").notNull(),
    domain: text("domain").notNull(),
    entityId: text("entity_id").notNull(),
    ssoUrl: text("sso_url").notNull(),
    certificateFingerprint: text("certificate_fingerprint").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    workspaceStatusIdx: index("sso_connections_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
    workspaceDomainUnique: uniqueIndex("sso_connections_workspace_domain_unique").on(
      table.workspaceId,
      table.domain
    )
  })
);

export const trustedDevices = pgTable(
  "trusted_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    fingerprint: text("fingerprint").notNull(),
    status: trustedDeviceStatusEnum("status").default("pending").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => ({
    userStatusIdx: index("trusted_devices_user_status_idx").on(table.userId, table.status),
    workspaceFingerprintUnique: uniqueIndex("trusted_devices_workspace_fingerprint_unique").on(
      table.workspaceId,
      table.fingerprint
    )
  })
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: authSessionStatusEnum("status").default("active").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    deviceId: uuid("device_id").references(() => trustedDevices.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => ({
    userStatusIdx: index("auth_sessions_user_status_idx").on(table.userId, table.status),
    workspaceLastSeenIdx: index("auth_sessions_workspace_last_seen_idx").on(
      table.workspaceId,
      table.lastSeenAt
    )
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

export const socialOAuthStates = pgTable(
  "social_oauth_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    state: text("state").notNull(),
    authorizationUrl: text("authorization_url").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scopes: text("scopes").array().default(sql`ARRAY[]::text[]`).notNull(),
    status: socialOAuthStateStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    stateUnique: uniqueIndex("social_oauth_states_state_unique").on(table.state),
    workspaceStatusIdx: index("social_oauth_states_workspace_status_idx").on(
      table.workspaceId,
      table.status
    )
  })
);

export const socialRateLimitBuckets = pgTable(
  "social_rate_limit_buckets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    bucketKey: text("bucket_key").notNull(),
    limit: integer("limit").notNull(),
    remaining: integer("remaining").notNull(),
    windowSeconds: integer("window_seconds").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    accountBucketUnique: uniqueIndex("social_rate_limit_buckets_account_bucket_unique").on(
      table.socialAccountId,
      table.bucketKey
    ),
    workspacePlatformIdx: index("social_rate_limit_buckets_workspace_platform_idx").on(
      table.workspaceId,
      table.platform
    )
  })
);

export const socialConnectorEvents = pgTable(
  "social_connector_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    socialAccountId: uuid("social_account_id").references(() => socialAccounts.id, {
      onDelete: "set null"
    }),
    platform: platformEnum("platform").notNull(),
    type: text("type").notNull(),
    severity: connectorEventSeverityEnum("severity").default("info").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    workspaceCreatedIdx: index("social_connector_events_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    accountCreatedIdx: index("social_connector_events_account_created_idx").on(
      table.socialAccountId,
      table.createdAt
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

export const campaignMilestones = pgTable(
  "campaign_milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    dueDate: date("due_date").notNull(),
    status: campaignMilestoneStatusEnum("status").default("pending").notNull(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    campaignDueIdx: index("campaign_milestones_campaign_due_idx").on(
      table.campaignId,
      table.dueDate
    ),
    workspaceStatusIdx: index("campaign_milestones_workspace_status_idx").on(
      table.workspaceId,
      table.status
    )
  })
);

export const campaignTasks = pgTable(
  "campaign_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: campaignTaskStatusEnum("status").default("todo").notNull(),
    priority: campaignTaskPriorityEnum("priority").default("normal").notNull(),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps
  },
  (table) => ({
    campaignStatusIdx: index("campaign_tasks_campaign_status_idx").on(
      table.campaignId,
      table.status
    ),
    workspacePriorityIdx: index("campaign_tasks_workspace_priority_idx").on(
      table.workspaceId,
      table.priority
    )
  })
);

export const campaignBudgetLines = pgTable(
  "campaign_budget_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    allocated: numeric("allocated", { precision: 14, scale: 2 }).default("0").notNull(),
    spent: numeric("spent", { precision: 14, scale: 2 }).default("0").notNull(),
    currency: text("currency").default("USD").notNull(),
    ...timestamps
  },
  (table) => ({
    campaignCategoryUnique: uniqueIndex("campaign_budget_lines_campaign_category_unique").on(
      table.campaignId,
      table.category
    ),
    workspaceCampaignIdx: index("campaign_budget_lines_workspace_campaign_idx").on(
      table.workspaceId,
      table.campaignId
    )
  })
);

export const campaignReports = pgTable(
  "campaign_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: campaignReportStatusEnum("status").default("generated").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    metrics: jsonb("metrics").$type<Record<string, number>>().notNull(),
    insights: jsonb("insights").$type<string[]>().default([]).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    sharedAt: timestamp("shared_at", { withTimezone: true })
  },
  (table) => ({
    campaignGeneratedIdx: index("campaign_reports_campaign_generated_idx").on(
      table.campaignId,
      table.generatedAt
    ),
    workspaceStatusIdx: index("campaign_reports_workspace_status_idx").on(
      table.workspaceId,
      table.status
    )
  })
);

export const reportTemplates = pgTable(
  "report_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: reportTypeEnum("type").notNull(),
    format: reportFormatEnum("format").notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>().default({}).notNull(),
    branding: jsonb("branding").$type<Record<string, unknown>>().default({}).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps
  },
  (table) => ({
    workspaceTypeIdx: index("report_templates_workspace_type_idx").on(table.workspaceId, table.type)
  })
);

export const scheduledReports = pgTable(
  "scheduled_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => reportTemplates.id, { onDelete: "cascade" }),
    frequency: reportScheduleFrequencyEnum("frequency").notNull(),
    recipients: text("recipients").array().default(sql`ARRAY[]::text[]`).notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    active: boolean("active").default(true).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps
  },
  (table) => ({
    workspaceNextRunIdx: index("scheduled_reports_workspace_next_run_idx").on(
      table.workspaceId,
      table.nextRunAt
    ),
    templateIdx: index("scheduled_reports_template_idx").on(table.templateId)
  })
);

export const reportExports = pgTable(
  "report_exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => reportTemplates.id, { onDelete: "set null" }),
    type: reportTypeEnum("type").notNull(),
    format: reportFormatEnum("format").notNull(),
    status: reportExportStatusEnum("status").default("queued").notNull(),
    downloadUrl: text("download_url"),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true })
  },
  (table) => ({
    workspaceStatusIdx: index("report_exports_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
    workspaceCreatedIdx: index("report_exports_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    )
  })
);

export const reportShareLinks = pgTable(
  "report_share_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    exportId: uuid("export_id")
      .notNull()
      .references(() => reportExports.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    status: reportShareLinkStatusEnum("status").default("active").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => ({
    tokenUnique: uniqueIndex("report_share_links_token_unique").on(table.token),
    exportIdx: index("report_share_links_export_idx").on(table.exportId),
    workspaceStatusIdx: index("report_share_links_workspace_status_idx").on(
      table.workspaceId,
      table.status
    )
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

export const listeningMonitors = pgTable(
  "listening_monitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: listeningMonitorTypeEnum("type").notNull(),
    query: text("query").notNull(),
    platforms: platformEnum("platforms").array().default(sql`ARRAY[]::platform[]`).notNull(),
    status: listeningMonitorStatusEnum("status").default("active").notNull(),
    alertThreshold: integer("alert_threshold").default(75).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps
  },
  (table) => ({
    workspaceStatusIdx: index("listening_monitors_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
    workspaceQueryIdx: index("listening_monitors_workspace_query_idx").on(table.workspaceId, table.query)
  })
);

export const socialMentions = pgTable(
  "social_mentions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => listeningMonitors.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    author: text("author").notNull(),
    content: text("content").notNull(),
    url: text("url"),
    sentiment: sentimentEnum("sentiment").notNull(),
    reach: integer("reach").default(0).notNull(),
    engagement: integer("engagement").default(0).notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull()
  },
  (table) => ({
    workspaceDetectedIdx: index("social_mentions_workspace_detected_idx").on(
      table.workspaceId,
      table.detectedAt
    ),
    monitorDetectedIdx: index("social_mentions_monitor_detected_idx").on(
      table.monitorId,
      table.detectedAt
    ),
    sentimentIdx: index("social_mentions_sentiment_idx").on(table.sentiment)
  })
);

export const listeningAlerts = pgTable(
  "listening_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => listeningMonitors.id, { onDelete: "cascade" }),
    mentionId: uuid("mention_id").references(() => socialMentions.id, { onDelete: "set null" }),
    severity: listeningAlertSeverityEnum("severity").default("info").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    resolved: boolean("resolved").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
  },
  (table) => ({
    workspaceResolvedIdx: index("listening_alerts_workspace_resolved_idx").on(
      table.workspaceId,
      table.resolved
    ),
    monitorCreatedIdx: index("listening_alerts_monitor_created_idx").on(table.monitorId, table.createdAt)
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

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    channelSettings: jsonb("channel_settings").$type<Record<string, boolean>>().default({}).notNull(),
    digestFrequency: notificationDigestFrequencyEnum("digest_frequency").default("instant").notNull(),
    quietHours: jsonb("quiet_hours").$type<Record<string, unknown>>(),
    mutedTypes: text("muted_types").array().default(sql`ARRAY[]::text[]`).notNull(),
    ...timestamps
  },
  (table) => ({
    userWorkspaceUnique: uniqueIndex("notification_preferences_user_workspace_unique").on(
      table.userId,
      table.workspaceId
    ),
    workspaceIdx: index("notification_preferences_workspace_idx").on(table.workspaceId)
  })
);

export const notificationDeliveryAttempts = pgTable(
  "notification_delivery_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    status: notificationDeliveryStatusEnum("status").default("pending").notNull(),
    provider: text("provider").notNull(),
    destination: text("destination").notNull(),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true })
  },
  (table) => ({
    notificationIdx: index("notification_delivery_attempts_notification_idx").on(table.notificationId),
    workspaceStatusIdx: index("notification_delivery_attempts_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
    userChannelIdx: index("notification_delivery_attempts_user_channel_idx").on(
      table.userId,
      table.channel
    )
  })
);

export const safetyPolicies = pgTable(
  "safety_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: safetyPolicyStatusEnum("status").default("draft").notNull(),
    rules: jsonb("rules").$type<Record<string, unknown>>().default({}).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps
  },
  (table) => ({
    workspaceStatusIdx: index("safety_policies_workspace_status_idx").on(
      table.workspaceId,
      table.status
    )
  })
);

export const contentSafetyChecks = pgTable(
  "content_safety_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id").references(() => safetyPolicies.id, { onDelete: "set null" }),
    source: text("source").notNull(),
    sourceEntityId: uuid("source_entity_id"),
    text: text("text").notNull(),
    status: contentSafetyStatusEnum("status").notNull(),
    severity: safetySeverityEnum("severity").notNull(),
    riskScore: numeric("risk_score", { precision: 4, scale: 3 }).notNull(),
    flags: text("flags").array().default(sql`ARRAY[]::text[]`).notNull(),
    recommendations: text("recommendations").array().default(sql`ARRAY[]::text[]`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    workspaceCreatedIdx: index("content_safety_checks_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    workspaceStatusIdx: index("content_safety_checks_workspace_status_idx").on(
      table.workspaceId,
      table.status
    )
  })
);

export const moderationQueueItems = pgTable(
  "moderation_queue_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    safetyCheckId: uuid("safety_check_id")
      .notNull()
      .references(() => contentSafetyChecks.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceEntityId: uuid("source_entity_id"),
    status: moderationStatusEnum("status").default("open").notNull(),
    reason: text("reason").notNull(),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    resolutionNote: text("resolution_note"),
    ...timestamps
  },
  (table) => ({
    workspaceStatusIdx: index("moderation_queue_items_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
    safetyCheckIdx: index("moderation_queue_items_safety_check_idx").on(table.safetyCheckId)
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
  invitations: many(workspaceInvitations),
  apiKeys: many(apiKeys),
  ssoConnections: many(ssoConnections),
  trustedDevices: many(trustedDevices),
  authSessions: many(authSessions),
  socialAccounts: many(socialAccounts),
  campaigns: many(campaigns),
  campaignMilestones: many(campaignMilestones),
  campaignTasks: many(campaignTasks),
  campaignBudgetLines: many(campaignBudgetLines),
  campaignReports: many(campaignReports),
  reportTemplates: many(reportTemplates),
  scheduledReports: many(scheduledReports),
  reportExports: many(reportExports),
  reportShareLinks: many(reportShareLinks),
  safetyPolicies: many(safetyPolicies),
  contentSafetyChecks: many(contentSafetyChecks),
  moderationQueueItems: many(moderationQueueItems),
  listeningMonitors: many(listeningMonitors),
  socialMentions: many(socialMentions),
  listeningAlerts: many(listeningAlerts),
  posts: many(posts)
}));

export const ssoConnectionsRelations = relations(ssoConnections, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [ssoConnections.workspaceId],
    references: [workspaces.id]
  }),
  creator: one(users, {
    fields: [ssoConnections.createdBy],
    references: [users.id]
  })
}));

export const trustedDevicesRelations = relations(trustedDevices, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [trustedDevices.workspaceId],
    references: [workspaces.id]
  }),
  user: one(users, {
    fields: [trustedDevices.userId],
    references: [users.id]
  }),
  sessions: many(authSessions)
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [authSessions.workspaceId],
    references: [workspaces.id]
  }),
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id]
  }),
  device: one(trustedDevices, {
    fields: [authSessions.deviceId],
    references: [trustedDevices.id]
  })
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [campaigns.workspaceId],
    references: [workspaces.id]
  }),
  creator: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id]
  }),
  posts: many(posts),
  milestones: many(campaignMilestones),
  tasks: many(campaignTasks),
  budgetLines: many(campaignBudgetLines),
  reports: many(campaignReports)
}));

export const campaignMilestonesRelations = relations(campaignMilestones, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [campaignMilestones.workspaceId],
    references: [workspaces.id]
  }),
  campaign: one(campaigns, {
    fields: [campaignMilestones.campaignId],
    references: [campaigns.id]
  }),
  owner: one(users, {
    fields: [campaignMilestones.ownerId],
    references: [users.id]
  })
}));

export const campaignTasksRelations = relations(campaignTasks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [campaignTasks.workspaceId],
    references: [workspaces.id]
  }),
  campaign: one(campaigns, {
    fields: [campaignTasks.campaignId],
    references: [campaigns.id]
  }),
  assignee: one(users, {
    fields: [campaignTasks.assigneeId],
    references: [users.id]
  })
}));

export const campaignBudgetLinesRelations = relations(campaignBudgetLines, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [campaignBudgetLines.workspaceId],
    references: [workspaces.id]
  }),
  campaign: one(campaigns, {
    fields: [campaignBudgetLines.campaignId],
    references: [campaigns.id]
  })
}));

export const campaignReportsRelations = relations(campaignReports, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [campaignReports.workspaceId],
    references: [workspaces.id]
  }),
  campaign: one(campaigns, {
    fields: [campaignReports.campaignId],
    references: [campaigns.id]
  })
}));

export const reportTemplatesRelations = relations(reportTemplates, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [reportTemplates.workspaceId],
    references: [workspaces.id]
  }),
  creator: one(users, {
    fields: [reportTemplates.createdBy],
    references: [users.id]
  }),
  schedules: many(scheduledReports),
  exports: many(reportExports)
}));

export const scheduledReportsRelations = relations(scheduledReports, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [scheduledReports.workspaceId],
    references: [workspaces.id]
  }),
  template: one(reportTemplates, {
    fields: [scheduledReports.templateId],
    references: [reportTemplates.id]
  }),
  creator: one(users, {
    fields: [scheduledReports.createdBy],
    references: [users.id]
  })
}));

export const reportExportsRelations = relations(reportExports, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [reportExports.workspaceId],
    references: [workspaces.id]
  }),
  template: one(reportTemplates, {
    fields: [reportExports.templateId],
    references: [reportTemplates.id]
  }),
  requester: one(users, {
    fields: [reportExports.requestedBy],
    references: [users.id]
  }),
  shareLinks: many(reportShareLinks)
}));

export const reportShareLinksRelations = relations(reportShareLinks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [reportShareLinks.workspaceId],
    references: [workspaces.id]
  }),
  export: one(reportExports, {
    fields: [reportShareLinks.exportId],
    references: [reportExports.id]
  }),
  creator: one(users, {
    fields: [reportShareLinks.createdBy],
    references: [users.id]
  })
}));

export const safetyPoliciesRelations = relations(safetyPolicies, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [safetyPolicies.workspaceId],
    references: [workspaces.id]
  }),
  creator: one(users, {
    fields: [safetyPolicies.createdBy],
    references: [users.id]
  }),
  checks: many(contentSafetyChecks)
}));

export const contentSafetyChecksRelations = relations(contentSafetyChecks, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [contentSafetyChecks.workspaceId],
    references: [workspaces.id]
  }),
  policy: one(safetyPolicies, {
    fields: [contentSafetyChecks.policyId],
    references: [safetyPolicies.id]
  }),
  moderationItems: many(moderationQueueItems)
}));

export const moderationQueueItemsRelations = relations(moderationQueueItems, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [moderationQueueItems.workspaceId],
    references: [workspaces.id]
  }),
  safetyCheck: one(contentSafetyChecks, {
    fields: [moderationQueueItems.safetyCheckId],
    references: [contentSafetyChecks.id]
  }),
  assignee: one(users, {
    fields: [moderationQueueItems.assignedTo],
    references: [users.id]
  })
}));

export const listeningMonitorsRelations = relations(listeningMonitors, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [listeningMonitors.workspaceId],
    references: [workspaces.id]
  }),
  creator: one(users, {
    fields: [listeningMonitors.createdBy],
    references: [users.id]
  }),
  mentions: many(socialMentions),
  alerts: many(listeningAlerts)
}));

export const socialMentionsRelations = relations(socialMentions, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [socialMentions.workspaceId],
    references: [workspaces.id]
  }),
  monitor: one(listeningMonitors, {
    fields: [socialMentions.monitorId],
    references: [listeningMonitors.id]
  }),
  alerts: many(listeningAlerts)
}));

export const listeningAlertsRelations = relations(listeningAlerts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [listeningAlerts.workspaceId],
    references: [workspaces.id]
  }),
  monitor: one(listeningMonitors, {
    fields: [listeningAlerts.monitorId],
    references: [listeningMonitors.id]
  }),
  mention: one(socialMentions, {
    fields: [listeningAlerts.mentionId],
    references: [socialMentions.id]
  })
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
