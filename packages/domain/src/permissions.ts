import type { Role } from "./constants.js";

export const permissions = [
  "platform.manage",
  "billing.manage",
  "workspace.manage",
  "workspace.delete",
  "members.invite",
  "members.manage",
  "api_keys.manage",
  "campaigns.manage",
  "campaigns.view",
  "posts.create",
  "posts.edit",
  "posts.schedule",
  "posts.publish",
  "posts.review",
  "posts.view",
  "media.manage",
  "analytics.view",
  "analytics.export",
  "social_accounts.manage",
  "brand_voice.manage",
  "ai.generate",
  "audit.view",
  "webhooks.manage"
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: [...permissions],
  owner: [
    "billing.manage",
    "workspace.manage",
    "workspace.delete",
    "members.invite",
    "members.manage",
    "api_keys.manage",
    "campaigns.manage",
    "campaigns.view",
    "posts.create",
    "posts.edit",
    "posts.schedule",
    "posts.publish",
    "posts.review",
    "posts.view",
    "media.manage",
    "analytics.view",
    "analytics.export",
    "social_accounts.manage",
    "brand_voice.manage",
    "ai.generate",
    "audit.view",
    "webhooks.manage"
  ],
  admin: [
    "workspace.manage",
    "members.invite",
    "members.manage",
    "api_keys.manage",
    "campaigns.manage",
    "campaigns.view",
    "posts.create",
    "posts.edit",
    "posts.schedule",
    "posts.publish",
    "posts.review",
    "posts.view",
    "media.manage",
    "analytics.view",
    "analytics.export",
    "social_accounts.manage",
    "brand_voice.manage",
    "ai.generate",
    "audit.view",
    "webhooks.manage"
  ],
  manager: [
    "campaigns.manage",
    "campaigns.view",
    "posts.create",
    "posts.edit",
    "posts.schedule",
    "posts.publish",
    "posts.review",
    "posts.view",
    "media.manage",
    "analytics.view",
    "analytics.export",
    "brand_voice.manage",
    "ai.generate"
  ],
  creator: [
    "campaigns.view",
    "posts.create",
    "posts.edit",
    "posts.schedule",
    "posts.view",
    "media.manage",
    "analytics.view",
    "ai.generate"
  ],
  reviewer: ["campaigns.view", "posts.review", "posts.view", "analytics.view"],
  viewer: ["campaigns.view", "posts.view", "analytics.view"],
  api_service_account: [
    "posts.create",
    "posts.edit",
    "posts.schedule",
    "posts.publish",
    "posts.view",
    "media.manage",
    "analytics.view",
    "analytics.export",
    "social_accounts.manage",
    "webhooks.manage"
  ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
