import { Injectable } from "@nestjs/common";
import {
  demoMediaAssets,
  groupSearchHits,
  rankSearchHits,
  type SearchHit,
  type SearchHitKind
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { CampaignsService } from "../campaigns/campaigns.service.js";
import { ContentTemplatesService } from "../content/content-templates.service.js";
import { MembersService } from "../members/members.service.js";
import { PostsService } from "../posts/posts.service.js";
import { SocialService } from "../social/social.service.js";
import type { SearchQueryDto } from "./dto.js";

/** Navigation targets, so the palette can jump to a page as well as a record. */
const staticPages: Array<{ title: string; subtitle: string; href: string; keywords: string[] }> = [
  { title: "Dashboard", subtitle: "Workspace overview", href: "/", keywords: ["home", "overview"] },
  { title: "Analytics", subtitle: "Performance and reporting", href: "/analytics", keywords: ["metrics", "reports"] },
  { title: "AI Studio", subtitle: "Generate on-brand content", href: "/ai-studio", keywords: ["generate", "copilot"] },
  { title: "Composer", subtitle: "Write and schedule a post", href: "/composer", keywords: ["new post", "create", "write"] },
  { title: "Calendar", subtitle: "Scheduled content", href: "/calendar", keywords: ["schedule", "planner"] },
  { title: "Media", subtitle: "Asset library", href: "/media", keywords: ["images", "video", "assets"] },
  { title: "Approvals", subtitle: "Review queue", href: "/approvals", keywords: ["review", "workflow"] },
  { title: "Publishing", subtitle: "Queue and retries", href: "/publishing", keywords: ["queue", "jobs"] },
  { title: "Accounts", subtitle: "Connected networks", href: "/accounts", keywords: ["social", "connections"] },
  { title: "Settings", subtitle: "Team, billing, security", href: "/settings", keywords: ["preferences", "admin"] }
];

/**
 * Cross-entity search.
 *
 * Every source is scoped to the caller's workspace before ranking, so a hit is
 * never returned for data the caller could not open. Ranking is shared with the
 * client (`@ssm/domain`) so the palette can re-order optimistically without the
 * list jumping when the server response arrives.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly postsService: PostsService,
    private readonly campaignsService: CampaignsService,
    private readonly socialService: SocialService,
    private readonly membersService: MembersService,
    private readonly templatesService: ContentTemplatesService
  ) {}

  search(query: SearchQueryDto, user: Principal) {
    const workspaceId = query.workspaceId ?? user.workspaceId;
    const kinds = query.kinds?.length ? new Set<SearchHitKind>(query.kinds) : undefined;
    const wants = (kind: SearchHitKind) => !kinds || kinds.has(kind);

    const hits: SearchHit[] = [];

    if (wants("post")) {
      for (const post of this.postsService.listAll(workspaceId)) {
        const primary = post.content[0];
        hits.push({
          id: post.id,
          kind: "post",
          title: summarize(primary?.text ?? "Untitled post"),
          subtitle: post.content.map((variant) => variant.platform).join(", "),
          href: `/composer?post=${post.id}`,
          badges: [post.status],
          timestamp: post.updatedAt,
          keywords: post.content.flatMap((variant) => variant.hashtags ?? [])
        });
      }
    }

    if (wants("campaign")) {
      for (const campaign of this.campaignsService.list(workspaceId)) {
        hits.push({
          id: campaign.id,
          kind: "campaign",
          title: campaign.name,
          subtitle: `${campaign.type.replace(/_/g, " ")} campaign`,
          href: `/calendar?campaign=${campaign.id}`,
          badges: [campaign.status],
          timestamp: campaign.updatedAt,
          keywords: campaign.objectives
        });
      }
    }

    if (wants("account")) {
      for (const account of this.socialService.listAccounts(workspaceId)) {
        hits.push({
          id: account.id,
          kind: "account",
          title: `@${account.username}`,
          subtitle: `${account.platform} · ${account.displayName}`,
          href: "/accounts",
          badges: [account.status],
          timestamp: account.updatedAt,
          keywords: [account.platform]
        });
      }
    }

    if (wants("media")) {
      for (const asset of demoMediaAssets.filter((item) => item.workspaceId === workspaceId)) {
        hits.push({
          id: asset.id,
          kind: "media",
          title: asset.fileName,
          subtitle: `${asset.assetType} · ${formatBytes(asset.fileSize)}`,
          href: "/media",
          badges: asset.tags.slice(0, 2),
          timestamp: asset.createdAt,
          keywords: asset.tags
        });
      }
    }

    if (wants("template")) {
      for (const template of this.templatesService.list(workspaceId)) {
        hits.push({
          id: template.id,
          kind: "template",
          title: template.name,
          subtitle: `${template.category.replace(/_/g, " ")} template`,
          href: "/calendar",
          badges: [template.status],
          timestamp: template.updatedAt,
          keywords: template.defaultHashtags
        });
      }
    }

    if (wants("member")) {
      for (const member of this.membersService.listMembers(workspaceId)) {
        hits.push({
          id: member.id,
          kind: "member",
          title: member.userId,
          subtitle: `${member.role} · ${member.status}`,
          href: "/settings",
          badges: [member.role],
          timestamp: member.joinedAt ?? member.invitedAt
        });
      }
    }

    if (wants("page")) {
      for (const page of staticPages) {
        hits.push({
          id: page.href,
          kind: "page",
          title: page.title,
          subtitle: page.subtitle,
          href: page.href,
          keywords: page.keywords
        });
      }
    }

    const ranked = rankSearchHits(query.q ?? "", hits, { limit: query.limit ?? 20 });

    return {
      query: query.q ?? "",
      total: ranked.length,
      /** Total candidates considered, so the UI can say "top 20 of 340". */
      scanned: hits.length,
      hits: ranked,
      groups: groupSearchHits(ranked)
    };
  }
}

/** Trims post copy into a single readable line for a result row. */
function summarize(text: string, max = 72): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
