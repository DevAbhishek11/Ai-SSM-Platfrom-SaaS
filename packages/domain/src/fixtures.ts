import type {
  AnalyticsSnapshot,
  ApiKey,
  AuditLog,
  BrandVoice,
  Campaign,
  CampaignBudgetLine,
  CampaignMilestone,
  CampaignReport,
  CampaignTask,
  ListeningAlert,
  ListeningMonitor,
  MediaAsset,
  MediaProcessingJob,
  Notification,
  NotificationDeliveryAttempt,
  NotificationPreference,
  ContentSafetyCheck,
  ModerationQueueItem,
  Post,
  PostComment,
  PublishingJob,
  SocialConnectorEvent,
  SocialOAuthState,
  SocialRateLimitBucket,
  SocialMention,
  SocialAccount,
  SafetyPolicy,
  TeamMember,
  Trend,
  User,
  WebhookDelivery,
  WebhookEndpoint,
  WorkflowEvent,
  WorkspaceInvitation,
  Workspace
} from "./schemas.js";

const now = "2026-06-11T05:45:00.000Z";

export const demoUser: User = {
  id: "77777777-7777-4777-8777-777777777777",
  email: "owner@acmegrowth.test",
  name: "Mira Shah",
  avatarUrl: undefined,
  timezone: "Asia/Calcutta",
  language: "en",
  status: "active",
  createdAt: now,
  updatedAt: now
};

export const demoWorkspace: Workspace = {
  id: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  name: "Acme Growth Lab",
  slug: "acme-growth-lab",
  branding: {
    primaryColor: "#111827",
    accentColor: "#0f766e"
  },
  settings: {
    timezone: "Asia/Calcutta",
    approvalSlaHours: 24,
    aiReviewRequiredForRegulatedContent: true
  },
  createdAt: now,
  updatedAt: now
};

export const demoTeamMembers: TeamMember[] = [
  {
    id: "41414141-4141-4414-8414-414141414141",
    userId: demoUser.id,
    workspaceId: demoWorkspace.id,
    role: "owner",
    status: "active",
    joinedAt: now
  }
];

export const demoWorkspaceInvitations: WorkspaceInvitation[] = [
  {
    id: "42424242-4242-4424-8424-424242424242",
    workspaceId: demoWorkspace.id,
    email: "reviewer@acmegrowth.test",
    role: "reviewer",
    status: "pending",
    tokenHash: "sha256:demo-invite-token-hash",
    invitedBy: demoUser.id,
    invitedAt: now,
    expiresAt: "2026-06-18T05:45:00.000Z"
  }
];

export const demoApiKeys: ApiKey[] = [
  {
    id: "43434343-4343-4434-8434-434343434343",
    workspaceId: demoWorkspace.id,
    name: "Publishing worker",
    keyPrefix: "ssm_live_demo",
    secretHash: "sha256:demo-api-key-secret-hash",
    scopes: ["posts.publish", "posts.view", "webhooks.manage"],
    status: "active",
    createdBy: demoUser.id,
    createdAt: now,
    lastUsedAt: "2026-06-11T05:40:00.000Z",
    expiresAt: "2026-09-11T05:45:00.000Z"
  }
];

export const demoSocialAccounts: SocialAccount[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    workspaceId: demoWorkspace.id,
    platform: "instagram",
    platformUserId: "ig_acme",
    username: "acmegrowth",
    displayName: "Acme Growth",
    permissions: { publish: true, insights: true, comments: true },
    status: "connected",
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    workspaceId: demoWorkspace.id,
    platform: "linkedin",
    platformUserId: "li_acme",
    username: "acme-growth",
    displayName: "Acme Growth Company Page",
    permissions: { publish: true, insights: true, comments: true },
    status: "connected",
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    workspaceId: demoWorkspace.id,
    platform: "x",
    platformUserId: "x_acme",
    username: "acmegrowth",
    displayName: "Acme Growth",
    permissions: { publish: true, insights: true },
    status: "expired",
    lastSyncedAt: "2026-06-10T04:45:00.000Z",
    createdAt: now,
    updatedAt: now
  }
];

export const demoSocialOAuthStates: SocialOAuthState[] = [
  {
    id: "32323232-3232-4323-8323-323232323232",
    workspaceId: demoWorkspace.id,
    platform: "instagram",
    state: "state-instagram-demo-20260611",
    authorizationUrl:
      "https://social.example.com/instagram/oauth/authorize?state=state-instagram-demo-20260611",
    redirectUri: "http://localhost:4000/api/social/oauth/callback",
    scopes: ["publish", "insights", "comments"],
    status: "pending",
    expiresAt: "2026-06-11T06:45:00.000Z",
    createdBy: demoUser.id,
    createdAt: now
  }
];

export const demoSocialRateLimitBuckets: SocialRateLimitBucket[] = [
  {
    id: "33333333-4444-4333-8444-333333333333",
    workspaceId: demoWorkspace.id,
    socialAccountId: "33333333-3333-4333-8333-333333333333",
    platform: "instagram",
    bucketKey: "publish",
    limit: 200,
    remaining: 184,
    windowSeconds: 3600,
    resetAt: "2026-06-11T06:45:00.000Z",
    updatedAt: now
  },
  {
    id: "34343434-3434-4343-8343-343434343434",
    workspaceId: demoWorkspace.id,
    socialAccountId: "44444444-4444-4444-8444-444444444444",
    platform: "linkedin",
    bucketKey: "publish",
    limit: 150,
    remaining: 91,
    windowSeconds: 3600,
    resetAt: "2026-06-11T06:45:00.000Z",
    updatedAt: now
  },
  {
    id: "35353535-3535-4353-8353-353535353535",
    workspaceId: demoWorkspace.id,
    socialAccountId: "55555555-5555-4555-8555-555555555555",
    platform: "x",
    bucketKey: "publish",
    limit: 100,
    remaining: 0,
    windowSeconds: 900,
    resetAt: "2026-06-11T06:00:00.000Z",
    updatedAt: "2026-06-10T04:45:00.000Z"
  }
];

export const demoSocialConnectorEvents: SocialConnectorEvent[] = [
  {
    id: "36363636-3636-4363-8363-363636363636",
    workspaceId: demoWorkspace.id,
    socialAccountId: "55555555-5555-4555-8555-555555555555",
    platform: "x",
    type: "token_expired",
    severity: "warning",
    message: "X token expired and publishing is paused for this account.",
    metadata: { action: "reconnect" },
    createdAt: "2026-06-10T04:45:00.000Z"
  },
  {
    id: "37373737-3737-4373-8373-373737373737",
    workspaceId: demoWorkspace.id,
    socialAccountId: "33333333-3333-4333-8333-333333333333",
    platform: "instagram",
    type: "scopes_validated",
    severity: "info",
    message: "Instagram scopes validated successfully.",
    metadata: { scopes: ["publish", "insights", "comments"] },
    createdAt: now
  }
];

export const demoCampaigns: Campaign[] = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    workspaceId: demoWorkspace.id,
    name: "Summer Product Launch",
    type: "product_launch",
    status: "active",
    startDate: "2026-06-01",
    endDate: "2026-07-15",
    budget: 45000,
    objectives: ["Drive qualified signups", "Increase share of voice", "Validate AI creative"],
    createdBy: "77777777-7777-4777-8777-777777777777",
    createdAt: now,
    updatedAt: now
  }
];

export const demoCampaignMilestones: CampaignMilestone[] = [
  {
    id: "56565656-5656-4565-8565-565656565656",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    name: "Launch narrative approved",
    description: "Positioning, proof points, and primary CTA signed off by brand and growth.",
    dueDate: "2026-06-05",
    status: "completed",
    ownerId: demoUser.id,
    completedAt: "2026-06-05T10:15:00.000Z",
    createdAt: now,
    updatedAt: "2026-06-05T10:15:00.000Z"
  },
  {
    id: "57575757-5757-4575-8575-575757575757",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    name: "Creator review sprint",
    description: "Review creator variants and approve platform-specific edits.",
    dueDate: "2026-06-14",
    status: "at_risk",
    ownerId: demoUser.id,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "58585858-5858-4585-8585-585858585858",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    name: "Launch day reporting pack",
    description: "Prepare executive metrics, listening signals, and paid spend summary.",
    dueDate: "2026-07-15",
    status: "pending",
    ownerId: demoUser.id,
    createdAt: now,
    updatedAt: now
  }
];

export const demoCampaignTasks: CampaignTask[] = [
  {
    id: "59595959-5959-4595-8595-595959595959",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    title: "Finalize LinkedIn launch thread",
    status: "in_progress",
    priority: "high",
    assigneeId: demoUser.id,
    dueDate: "2026-06-12",
    metadata: { channel: "linkedin", workflow: "approval" },
    createdAt: now,
    updatedAt: now
  },
  {
    id: "60606060-6060-4606-8606-606060606060",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    title: "Reconnect X account before teaser queue",
    status: "blocked",
    priority: "urgent",
    assigneeId: demoUser.id,
    dueDate: "2026-06-11",
    metadata: { accountStatus: "expired" },
    createdAt: now,
    updatedAt: now
  },
  {
    id: "61616161-6161-4616-8616-616161616161",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    title: "Brief paid creative variants",
    status: "todo",
    priority: "normal",
    assigneeId: demoUser.id,
    dueDate: "2026-06-18",
    metadata: { budgetCategory: "paid_social" },
    createdAt: now,
    updatedAt: now
  }
];

export const demoCampaignBudgetLines: CampaignBudgetLine[] = [
  {
    id: "62626262-6262-4626-8626-626262626262",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    category: "Paid social",
    allocated: 20000,
    spent: 8200,
    currency: "USD",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "63636363-6363-4636-8636-636363636363",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    category: "Creator partners",
    allocated: 15000,
    spent: 6400,
    currency: "USD",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "64646464-6464-4646-8646-646464646464",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    category: "Production",
    allocated: 10000,
    spent: 9100,
    currency: "USD",
    createdAt: now,
    updatedAt: now
  }
];

export const demoCampaignReports: CampaignReport[] = [
  {
    id: "65656565-6565-4656-8656-656565656565",
    workspaceId: demoWorkspace.id,
    campaignId: "66666666-6666-4666-8666-666666666666",
    title: "Summer Product Launch mid-flight report",
    status: "generated",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-11",
    metrics: {
      posts: 2,
      published: 0,
      scheduled: 1,
      impressions: 149000,
      engagements: 7400,
      conversions: 480,
      spend: 23700,
      roi: 1.8,
      engagementRate: 0.0497
    },
    insights: [
      "LinkedIn carries the strongest approval-ready narrative for launch operators.",
      "Paid social spend is pacing below the campaign budget while production spend is near cap.",
      "X account reconnection remains the highest operational risk before teaser publishing."
    ],
    generatedAt: now
  }
];

export const demoBrandVoices: BrandVoice[] = [
  {
    id: "99999999-9999-4999-8999-999999999999",
    workspaceId: demoWorkspace.id,
    name: "Acme Practical Confidence",
    tone: {
      primary: "confident",
      secondary: "practical",
      avoid: ["hype", "fearmongering", "vague futurism"]
    },
    style: {
      sentenceLength: "medium",
      formality: "professional",
      jargonTolerance: "low",
      readingLevel: "grade-8"
    },
    vocabulary: {
      preferredTerms: ["launch operations", "workflow", "planning sprint", "approval loop"],
      bannedTerms: ["revolutionary", "guaranteed", "10x"],
      industryTerms: ["campaign calendar", "content ops", "brand governance"]
    },
    emojiUsage: "light",
    ctaPreferences: {
      mode: "value-led",
      examples: ["Save this for your next planning sprint.", "Start with the launch checklist today."]
    },
    examples: [
      "Teams move faster when strategy, approvals, and analytics share one workflow.",
      "A calm launch comes from practical planning, clear owners, and fewer surprise handoffs."
    ],
    version: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "49494949-4949-4494-8494-494949494949",
    workspaceId: demoWorkspace.id,
    name: "Executive Launch Brief",
    tone: {
      primary: "authoritative",
      secondary: "concise",
      avoid: ["slang", "overpromising"]
    },
    style: {
      sentenceLength: "short",
      formality: "executive",
      jargonTolerance: "medium",
      readingLevel: "grade-10"
    },
    vocabulary: {
      preferredTerms: ["operating rhythm", "governance", "measurable pipeline"],
      bannedTerms: ["viral", "magic", "hack"],
      industryTerms: ["ROI", "pipeline", "campaign governance"]
    },
    emojiUsage: "none",
    ctaPreferences: {
      mode: "executive",
      examples: ["Review the launch operating model.", "Align the next campaign milestone."]
    },
    examples: [
      "Launch performance improves when every asset has a clear owner, approval path, and measurement plan."
    ],
    version: 1,
    createdAt: now,
    updatedAt: now
  }
];

export const demoPosts: Post[] = [
  {
    id: "88888888-8888-4888-8888-888888888888",
    workspaceId: demoWorkspace.id,
    campaignId: demoCampaigns[0]?.id,
    authorId: "77777777-7777-4777-8777-777777777777",
    status: "scheduled",
    content: [
      {
        platform: "instagram",
        text: "Meet the workflow upgrade built for lean teams: plan, approve, and publish every launch asset from one AI-assisted calendar.",
        hashtags: ["LaunchOps", "SocialMedia", "AIContent"]
      },
      {
        platform: "linkedin",
        text: "Launch operations should feel coordinated, measurable, and fast. Our new AI-assisted calendar helps teams move from brief to approved social content with fewer handoffs.",
        hashtags: ["B2BMarketing", "LaunchOps"]
      }
    ],
    mediaIds: [],
    scheduledAt: "2026-06-12T10:30:00.000Z",
    aiGenerated: true,
    aiModelUsed: "model-router/default",
    brandVoiceId: "99999999-9999-4999-8999-999999999999",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workspaceId: demoWorkspace.id,
    campaignId: demoCampaigns[0]?.id,
    authorId: "77777777-7777-4777-8777-777777777777",
    status: "in_review",
    content: [
      {
        platform: "x",
        text: "The best launch calendar is the one your whole team trusts. One source of truth, built-in approvals, and AI that remembers your brand voice.",
        hashtags: ["SocialOps", "AI"]
      }
    ],
    mediaIds: [],
    scheduledAt: "2026-06-13T14:00:00.000Z",
    aiGenerated: true,
    aiModelUsed: "model-router/default",
    createdAt: now,
    updatedAt: now
  }
];

export const demoAnalytics: AnalyticsSnapshot[] = [
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    workspaceId: demoWorkspace.id,
    socialAccountId: demoSocialAccounts[0]?.id,
    snapshotDate: "2026-06-10",
    platform: "instagram",
    metrics: {
      impressions: 154200,
      reach: 98140,
      engagements: 8120,
      clicks: 1840,
      conversions: 126
    }
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    workspaceId: demoWorkspace.id,
    socialAccountId: demoSocialAccounts[1]?.id,
    snapshotDate: "2026-06-10",
    platform: "linkedin",
    metrics: {
      impressions: 88400,
      reach: 60200,
      engagements: 5310,
      clicks: 2210,
      conversions: 248
    }
  }
];

export const demoTrends: Trend[] = [
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    workspaceId: demoWorkspace.id,
    keyword: "AI content approvals",
    hashtag: "AIContent",
    source: "linkedin",
    volume: 18400,
    opportunityScore: 86,
    sentiment: "positive",
    detectedAt: now,
    expiresAt: "2026-06-14T05:45:00.000Z"
  },
  {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    workspaceId: demoWorkspace.id,
    keyword: "social media scheduling",
    hashtag: "SocialMediaMarketing",
    source: "x",
    volume: 42100,
    opportunityScore: 78,
    sentiment: "mixed",
    detectedAt: now,
    expiresAt: "2026-06-13T05:45:00.000Z"
  }
];

export const demoListeningMonitors: ListeningMonitor[] = [
  {
    id: "50505050-5050-4505-8505-505050505050",
    workspaceId: demoWorkspace.id,
    type: "brand",
    query: "Acme Growth",
    platforms: ["x", "linkedin", "reddit"],
    status: "active",
    alertThreshold: 72,
    createdBy: demoUser.id,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "51515151-5151-4515-8515-515151515151",
    workspaceId: demoWorkspace.id,
    type: "competitor",
    query: "LaunchFlow",
    platforms: ["linkedin", "x"],
    status: "active",
    alertThreshold: 80,
    createdBy: demoUser.id,
    createdAt: now,
    updatedAt: now
  }
];

export const demoSocialMentions: SocialMention[] = [
  {
    id: "52525252-5252-4525-8525-525252525252",
    workspaceId: demoWorkspace.id,
    monitorId: "50505050-5050-4505-8505-505050505050",
    platform: "linkedin",
    author: "Priya MarketingOps",
    content: "Acme Growth has a practical approval workflow for busy campaign teams.",
    url: "https://social.example.com/linkedin/mentions/5252",
    sentiment: "positive",
    reach: 18400,
    engagement: 640,
    detectedAt: now,
    metadata: { source: "demo-listener" }
  },
  {
    id: "53535353-5353-4535-8535-535353535353",
    workspaceId: demoWorkspace.id,
    monitorId: "50505050-5050-4505-8505-505050505050",
    platform: "x",
    author: "LaunchOps Watch",
    content: "Acme Growth account connection seems broken before launch day.",
    url: "https://social.example.com/x/mentions/5353",
    sentiment: "negative",
    reach: 91000,
    engagement: 2100,
    detectedAt: "2026-06-11T05:30:00.000Z",
    metadata: { source: "demo-listener", crisisSignal: true }
  }
];

export const demoListeningAlerts: ListeningAlert[] = [
  {
    id: "54545454-5454-4545-8545-545454545454",
    workspaceId: demoWorkspace.id,
    monitorId: "50505050-5050-4505-8505-505050505050",
    mentionId: "53535353-5353-4535-8535-535353535353",
    severity: "critical",
    title: "Negative brand mention is gaining reach",
    body: "A high-reach X mention reports broken account connection before launch day.",
    resolved: false,
    createdAt: "2026-06-11T05:30:00.000Z"
  }
];

export const demoMediaAssets: MediaAsset[] = [
  {
    id: "12121212-1212-4121-8121-121212121212",
    workspaceId: demoWorkspace.id,
    fileName: "launch-hero-4x5.webp",
    assetType: "image",
    fileType: "image/webp",
    fileSize: 842114,
    storageKey: "workspaces/acme-growth-lab/media/launch-hero-4x5.webp",
    cdnUrl: "https://cdn.example.com/workspaces/acme-growth-lab/media/launch-hero-4x5.webp",
    thumbnailUrl: "https://cdn.example.com/workspaces/acme-growth-lab/media/thumbs/launch-hero-4x5.webp",
    tags: ["launch", "hero", "instagram"],
    metadata: { width: 1080, height: 1350, copyright: "Acme Growth" },
    aiTags: { objects: ["dashboard", "calendar"], colors: ["teal", "white"] },
    createdBy: demoUser.id,
    createdAt: now
  },
  {
    id: "13131313-1313-4131-8131-131313131313",
    workspaceId: demoWorkspace.id,
    fileName: "product-demo-short.mp4",
    assetType: "video",
    fileType: "video/mp4",
    fileSize: 18421140,
    storageKey: "workspaces/acme-growth-lab/media/product-demo-short.mp4",
    cdnUrl: "https://cdn.example.com/workspaces/acme-growth-lab/media/product-demo-short.mp4",
    thumbnailUrl: "https://cdn.example.com/workspaces/acme-growth-lab/media/thumbs/product-demo-short.webp",
    tags: ["demo", "short-form", "launch"],
    metadata: { durationSeconds: 28, aspectRatio: "9:16" },
    aiTags: { scenes: ["workflow", "analytics"] },
    createdBy: demoUser.id,
    createdAt: now
  }
];

export const demoMediaProcessingJobs: MediaProcessingJob[] = [
  {
    id: "28282828-2828-4282-8282-282828282828",
    workspaceId: demoWorkspace.id,
    assetId: "12121212-1212-4121-8121-121212121212",
    uploadIntentId: "29292929-2929-4292-8292-292929292929",
    fileName: "launch-hero-4x5.webp",
    fileType: "image/webp",
    fileSize: 842114,
    storageKey: "workspaces/acme-growth-lab/media/launch-hero-4x5.webp",
    status: "completed",
    currentStep: "cdn_distributing",
    progress: 100,
    checksumSha256: "sha256-demo-launch-hero",
    virusScan: {
      status: "clean",
      engine: "clamav-demo",
      scannedAt: now
    },
    output: {
      cdnUrl: "https://cdn.example.com/workspaces/acme-growth-lab/media/launch-hero-4x5.webp",
      thumbnailUrl: "https://cdn.example.com/workspaces/acme-growth-lab/media/thumbs/launch-hero-4x5.webp",
      optimizedBytes: 612004,
      tags: ["launch", "hero", "instagram"]
    },
    createdAt: now,
    updatedAt: now
  },
  {
    id: "30303030-3030-4303-8303-303030303030",
    workspaceId: demoWorkspace.id,
    assetId: "13131313-1313-4131-8131-131313131313",
    uploadIntentId: "31313131-3131-4313-8313-313131313131",
    fileName: "product-demo-short.mp4",
    fileType: "video/mp4",
    fileSize: 18421140,
    storageKey: "workspaces/acme-growth-lab/media/product-demo-short.mp4",
    status: "thumbnailing",
    currentStep: "thumbnailing",
    progress: 58,
    checksumSha256: "sha256-demo-product-demo",
    virusScan: {
      status: "clean",
      engine: "clamav-demo",
      scannedAt: "2026-06-11T05:50:00.000Z"
    },
    output: {
      optimizedBytes: 15120400,
      tags: ["demo", "short-form", "launch"]
    },
    createdAt: "2026-06-11T05:50:00.000Z",
    updatedAt: "2026-06-11T05:55:00.000Z"
  }
];

export const demoNotifications: Notification[] = [
  {
    id: "14141414-1414-4141-8141-141414141414",
    userId: demoUser.id,
    type: "approval_request",
    title: "Post ready for review",
    body: "A LinkedIn launch post is waiting in the approval queue.",
    metadata: { postId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    read: false,
    createdAt: now
  },
  {
    id: "15151515-1515-4151-8151-151515151515",
    userId: demoUser.id,
    type: "account_issue",
    title: "Reconnect X account",
    body: "The token for @acmegrowth expired and publishing is paused for that account.",
    metadata: { accountId: "55555555-5555-4555-8555-555555555555" },
    read: false,
    createdAt: "2026-06-10T04:45:00.000Z"
  }
];

export const demoNotificationPreferences: NotificationPreference[] = [
  {
    id: "45454545-4545-4454-8454-454545454545",
    userId: demoUser.id,
    workspaceId: demoWorkspace.id,
    channelSettings: {
      in_app: true,
      email: true,
      push: false,
      slack: true,
      teams: false,
      sms: true,
      webhook: true
    },
    digestFrequency: "instant",
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "07:00",
      timezone: "Asia/Calcutta"
    },
    mutedTypes: ["performance_milestone"],
    createdAt: now,
    updatedAt: now
  }
];

export const demoNotificationDeliveryAttempts: NotificationDeliveryAttempt[] = [
  {
    id: "46464646-4646-4464-8464-464646464646",
    notificationId: "14141414-1414-4141-8141-141414141414",
    workspaceId: demoWorkspace.id,
    userId: demoUser.id,
    channel: "in_app",
    status: "sent",
    provider: "ssm-in-app",
    destination: demoUser.id,
    metadata: { priority: "normal" },
    attemptedAt: now,
    deliveredAt: now
  },
  {
    id: "47474747-4747-4474-8474-474747474747",
    notificationId: "15151515-1515-4151-8151-151515151515",
    workspaceId: demoWorkspace.id,
    userId: demoUser.id,
    channel: "email",
    status: "sent",
    provider: "resend-demo",
    destination: demoUser.email,
    metadata: { priority: "high" },
    attemptedAt: "2026-06-10T04:45:00.000Z",
    deliveredAt: "2026-06-10T04:45:02.000Z"
  },
  {
    id: "48484848-4848-4484-8484-484848484848",
    notificationId: "15151515-1515-4151-8151-151515151515",
    workspaceId: demoWorkspace.id,
    userId: demoUser.id,
    channel: "slack",
    status: "suppressed",
    provider: "slack-demo",
    destination: "#social-ops",
    errorMessage: "Suppressed by quiet hours.",
    metadata: { priority: "high", quietHours: true },
    attemptedAt: "2026-06-10T04:45:00.000Z"
  }
];

export const demoSafetyPolicies: SafetyPolicy[] = [
  {
    id: "67676767-6767-4676-8676-676767676767",
    workspaceId: demoWorkspace.id,
    name: "Default AI publishing guardrails",
    status: "active",
    rules: {
      blockedTerms: ["guaranteed return", "risk-free investment", "cure"],
      requiredDisclosures: ["AI-assisted draft", "reviewed by social team"],
      industry: "b2b_saas",
      maxRiskScore: 0.72
    },
    createdBy: demoUser.id,
    createdAt: now,
    updatedAt: now
  }
];

export const demoContentSafetyChecks: ContentSafetyCheck[] = [
  {
    id: "68686868-6868-4686-8686-686868686868",
    workspaceId: demoWorkspace.id,
    policyId: "67676767-6767-4676-8676-676767676767",
    source: "ai_generation",
    text: "Our AI workflow guarantees risk-free investment returns for every launch.",
    status: "blocked",
    severity: "critical",
    riskScore: 0.92,
    flags: ["financial_claim", "policy_blocked_term:guaranteed return", "policy_blocked_term:risk-free investment"],
    recommendations: [
      "Remove guaranteed financial outcome claims.",
      "Add approved disclosure language before publishing."
    ],
    createdAt: now
  }
];

export const demoModerationQueueItems: ModerationQueueItem[] = [
  {
    id: "69696969-6969-4696-8696-696969696969",
    workspaceId: demoWorkspace.id,
    safetyCheckId: "68686868-6868-4686-8686-686868686868",
    source: "ai_generation",
    status: "open",
    reason: "Blocked AI draft contains prohibited financial claims.",
    assignedTo: demoUser.id,
    createdAt: now,
    updatedAt: now
  }
];

export const demoAuditLogs: AuditLog[] = [
  {
    id: "38383838-3838-4383-8383-383838383838",
    workspaceId: demoWorkspace.id,
    userId: demoUser.id,
    action: "auth.login_succeeded",
    entityType: "session",
    newValues: { role: "owner", email: demoUser.email },
    ipAddress: "127.0.0.1",
    userAgent: "local-dev",
    createdAt: now
  },
  {
    id: "39393939-3939-4393-8393-393939393939",
    workspaceId: demoWorkspace.id,
    userId: demoUser.id,
    action: "workflow.submitted_for_review",
    entityType: "post",
    entityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    oldValues: { status: "draft" },
    newValues: { status: "in_review" },
    ipAddress: "127.0.0.1",
    userAgent: "local-dev",
    createdAt: "2026-06-11T03:30:00.000Z"
  },
  {
    id: "40404040-4040-4404-8404-404040404040",
    workspaceId: demoWorkspace.id,
    userId: demoUser.id,
    action: "social.token_expired",
    entityType: "social_account",
    entityId: "55555555-5555-4555-8555-555555555555",
    oldValues: { status: "connected" },
    newValues: { status: "expired", platform: "x" },
    ipAddress: "127.0.0.1",
    userAgent: "connector-worker",
    createdAt: "2026-06-10T04:45:00.000Z"
  }
];

export const demoWebhookDeliveries: WebhookDelivery[] = [
  {
    id: "16161616-1616-4161-8161-161616161616",
    workspaceId: demoWorkspace.id,
    eventType: "post.scheduled",
    payload: { postId: "88888888-8888-4888-8888-888888888888" },
    status: "delivered",
    attempts: 1,
    responseCode: 200,
    createdAt: now
  },
  {
    id: "17171717-1717-4171-8171-171717171717",
    workspaceId: demoWorkspace.id,
    eventType: "social_account.expired",
    payload: { accountId: "55555555-5555-4555-8555-555555555555" },
    status: "pending",
    attempts: 2,
    nextRetryAt: "2026-06-11T06:15:00.000Z",
    createdAt: now
  }
];

export const demoWebhookEndpoints: WebhookEndpoint[] = [
  {
    id: "18181818-1818-4181-8181-181818181818",
    workspaceId: demoWorkspace.id,
    url: "https://hooks.example.com/acme/social-events",
    description: "Operations event sink",
    events: ["post.scheduled", "post.published", "social_account.expired"],
    secretHash: "sha256:demo-redacted",
    status: "active",
    failureCount: 0,
    lastDeliveredAt: now,
    createdAt: now,
    updatedAt: now
  }
];

export const demoPublishingJobs: PublishingJob[] = [
  {
    id: "19191919-1919-4191-8191-191919191919",
    workspaceId: demoWorkspace.id,
    postId: "88888888-8888-4888-8888-888888888888",
    socialAccountId: "33333333-3333-4333-8333-333333333333",
    platform: "instagram",
    status: "queued",
    idempotencyKey: "post-88888888-instagram-20260612T103000Z",
    scheduledFor: "2026-06-12T10:30:00.000Z",
    attempts: 0,
    maxAttempts: 5,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "20202020-2020-4202-8202-202020202020",
    workspaceId: demoWorkspace.id,
    postId: "88888888-8888-4888-8888-888888888888",
    socialAccountId: "44444444-4444-4444-8444-444444444444",
    platform: "linkedin",
    status: "queued",
    idempotencyKey: "post-88888888-linkedin-20260612T103000Z",
    scheduledFor: "2026-06-12T10:30:00.000Z",
    attempts: 0,
    maxAttempts: 5,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "21212121-2121-4212-8212-212121212121",
    workspaceId: demoWorkspace.id,
    postId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    socialAccountId: "55555555-5555-4555-8555-555555555555",
    platform: "x",
    status: "failed",
    idempotencyKey: "post-aaaaaaaa-x-20260613T140000Z",
    scheduledFor: "2026-06-13T14:00:00.000Z",
    attempts: 2,
    maxAttempts: 5,
    lastError: "OAuth token expired before publish window.",
    nextRetryAt: "2026-06-11T06:30:00.000Z",
    createdAt: now,
    updatedAt: now
  }
];

export const demoPostComments: PostComment[] = [
  {
    id: "22222222-3333-4222-8333-222222222222",
    postId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workspaceId: demoWorkspace.id,
    authorId: demoUser.id,
    body: "Please tighten the hook and confirm the X token is refreshed before scheduling.",
    resolved: false,
    createdAt: "2026-06-11T04:15:00.000Z",
    updatedAt: "2026-06-11T04:15:00.000Z"
  }
];

export const demoWorkflowEvents: WorkflowEvent[] = [
  {
    id: "23232323-2323-4232-8232-232323232323",
    postId: "88888888-8888-4888-8888-888888888888",
    workspaceId: demoWorkspace.id,
    actorId: demoUser.id,
    action: "submitted_for_review",
    fromStatus: "draft",
    toStatus: "in_review",
    comment: "Launch sequence ready for manager review.",
    metadata: {},
    createdAt: "2026-06-10T08:00:00.000Z"
  },
  {
    id: "24242424-2424-4242-8242-242424242424",
    postId: "88888888-8888-4888-8888-888888888888",
    workspaceId: demoWorkspace.id,
    actorId: demoUser.id,
    action: "approved",
    fromStatus: "in_review",
    toStatus: "approved",
    comment: "Approved for launch calendar.",
    metadata: {},
    createdAt: "2026-06-10T09:00:00.000Z"
  },
  {
    id: "25252525-2525-4252-8252-252525252525",
    postId: "88888888-8888-4888-8888-888888888888",
    workspaceId: demoWorkspace.id,
    actorId: demoUser.id,
    action: "scheduled",
    fromStatus: "approved",
    toStatus: "scheduled",
    comment: "Scheduled for primary launch slot.",
    metadata: { scheduledAt: "2026-06-12T10:30:00.000Z" },
    createdAt: "2026-06-10T09:15:00.000Z"
  },
  {
    id: "26262626-2626-4262-8262-262626262626",
    postId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workspaceId: demoWorkspace.id,
    actorId: demoUser.id,
    action: "submitted_for_review",
    fromStatus: "draft",
    toStatus: "in_review",
    comment: "Needs quick compliance look.",
    metadata: {},
    createdAt: "2026-06-11T03:30:00.000Z"
  },
  {
    id: "27272727-2727-4272-8272-272727272727",
    postId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workspaceId: demoWorkspace.id,
    actorId: demoUser.id,
    action: "commented",
    comment: "Please tighten the hook and confirm the X token is refreshed before scheduling.",
    metadata: {},
    createdAt: "2026-06-11T04:15:00.000Z"
  }
];
