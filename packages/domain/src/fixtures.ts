import type {
  AnalyticsSnapshot,
  Campaign,
  Post,
  SocialAccount,
  Trend,
  Workspace
} from "./schemas.js";

const now = "2026-06-11T05:45:00.000Z";

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
