import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { validatePost, type Platform, type Post, type PostStatus } from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import { BillingService } from "../billing/billing.service.js";
import { PostsRepository } from "../repositories/posts.repository.js";
import type {
  CreatePostDto,
  ListPostsQueryDto,
  UpdatePostDto,
  ValidatePostDto
} from "./dto.js";

/** Statuses whose content may still be edited in place. */
const editableStatuses: PostStatus[] = ["draft", "revisions_needed", "approved", "scheduled"];

export type PostListResult = {
  items: Post[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Counts across the *filtered* set, for filter-chip badges. */
  facets: {
    status: Record<string, number>;
    platform: Record<string, number>;
  };
};

@Injectable()
export class PostsService {
  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly billingService: BillingService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Filtered, sorted, paginated listing.
   *
   * Filtering happens before pagination (so page 2 is stable) and facets are
   * computed on the filtered set before the page slice, so the chips show how
   * many results exist rather than how many are on screen.
   */
  list(query: ListPostsQueryDto & { workspaceId: string }): PostListResult {
    const all = this.postsRepository.listByWorkspace(query.workspaceId);
    const term = query.q?.trim().toLowerCase();

    const filtered = all.filter((post) => {
      if (query.status?.length && !query.status.includes(post.status)) return false;
      if (query.campaignId && post.campaignId !== query.campaignId) return false;
      if (
        query.platform?.length &&
        !post.content.some((variant) => query.platform?.includes(variant.platform))
      ) {
        return false;
      }

      const when = post.scheduledAt ?? post.createdAt;
      if (query.from && when < query.from) return false;
      if (query.to && when > query.to) return false;

      if (term) {
        const haystack = post.content
          .map((variant) => `${variant.text} ${(variant.hashtags ?? []).join(" ")}`)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });

    const facets = {
      status: countBy(filtered, (post) => post.status),
      platform: countBy(
        filtered.flatMap((post) => post.content.map((variant) => variant.platform)),
        (platform) => platform
      )
    };

    const sortField = query.sort ?? "scheduledAt";
    const direction = query.direction === "desc" ? -1 : 1;
    const sorted = [...filtered].sort((a, b) => {
      const left = sortValue(a, sortField);
      const right = sortValue(b, sortField);
      return left.localeCompare(right) * direction;
    });

    const pageSize = query.pageSize ?? 25;
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    // Clamping keeps a deep-linked page beyond the end from returning nothing.
    const page = Math.min(Math.max(query.page ?? 1, 1), totalPages);
    const start = (page - 1) * pageSize;

    return {
      items: sorted.slice(start, start + pageSize),
      page,
      pageSize,
      total: sorted.length,
      totalPages,
      facets
    };
  }

  /** Unpaginated listing for internal callers that aggregate over everything. */
  listAll(workspaceId: string): Post[] {
    return this.postsRepository.listByWorkspace(workspaceId);
  }

  findOne(id: string, workspaceId: string): Post {
    const post = this.postsRepository.findById(id);
    // A post in another workspace is reported as missing, not forbidden: the
    // difference would confirm that the id exists.
    if (!post || post.workspaceId !== workspaceId) {
      throw new NotFoundException("Post not found");
    }
    return post;
  }

  create(input: CreatePostDto, user?: Principal): Post {
    this.billingService.assertAllowed(input.workspaceId, "postsThisMonth", 1);
    const status = input.status ?? (input.scheduledAt ? "scheduled" : "draft");
    this.assertContentValid(input.content, input.scheduledAt, input.mediaIds?.length ?? 0, {
      requireMedia: status !== "draft"
    });

    const now = new Date().toISOString();
    const post: Post = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      authorId: user?.userId ?? "77777777-7777-4777-8777-777777777777",
      status,
      content: input.content.map((variant) => ({
        platform: variant.platform,
        text: variant.text,
        hashtags: variant.hashtags ?? [],
        firstComment: variant.firstComment,
        link: variant.link
      })),
      mediaIds: input.mediaIds ?? [],
      scheduledAt: input.scheduledAt,
      aiGenerated: input.aiGenerated ?? false,
      createdAt: now,
      updatedAt: now
    };

    const saved = this.postsRepository.save(post);
    this.audit(user, saved, "post.created", undefined, { status: saved.status });
    return saved;
  }

  /**
   * Applies a partial edit.
   *
   * Rejects edits to posts that have left the editable window, and honours an
   * optimistic-concurrency token so two editors cannot silently overwrite each
   * other.
   */
  update(id: string, input: UpdatePostDto, user: Principal): Post {
    const post = this.findOne(id, user.workspaceId);

    if (!editableStatuses.includes(post.status)) {
      throw new BadRequestException(`A ${post.status} post can no longer be edited`);
    }

    const hasChange = Object.entries(input).some(
      ([key, value]) => key !== "expectedUpdatedAt" && value !== undefined
    );
    if (!hasChange) {
      throw new BadRequestException("No changes supplied");
    }

    if (input.expectedUpdatedAt && input.expectedUpdatedAt !== post.updatedAt) {
      throw new ConflictException(
        "This post changed since you opened it. Reload to see the latest version."
      );
    }

    const content = input.content
      ? input.content.map((variant) => ({
          platform: variant.platform,
          text: variant.text,
          hashtags: variant.hashtags ?? [],
          firstComment: variant.firstComment,
          link: variant.link
        }))
      : post.content;
    const mediaIds = input.mediaIds ?? post.mediaIds;
    const scheduledAt = input.scheduledAt ?? post.scheduledAt;

    this.assertContentValid(
      content,
      // Only re-check the schedule when the caller actually moved it; an
      // untouched past schedule on an existing post is not this edit's problem.
      input.scheduledAt,
      mediaIds.length,
      { requireMedia: post.status !== "draft" }
    );

    const before = { status: post.status, scheduledAt: post.scheduledAt };
    const updated: Post = {
      ...post,
      content,
      mediaIds,
      scheduledAt,
      campaignId: input.campaignId ?? post.campaignId,
      brandVoiceId: input.brandVoiceId ?? post.brandVoiceId,
      updatedAt: new Date().toISOString()
    };

    const saved = this.postsRepository.save(updated);
    this.audit(user, saved, "post.updated", before, {
      status: saved.status,
      scheduledAt: saved.scheduledAt
    });
    return saved;
  }

  /** Copies a post back to draft so a proven message can be reused safely. */
  duplicate(id: string, user: Principal): Post {
    const source = this.findOne(id, user.workspaceId);
    this.billingService.assertAllowed(source.workspaceId, "postsThisMonth", 1);

    const now = new Date().toISOString();
    const copy: Post = {
      ...source,
      id: randomUUID(),
      status: "draft",
      // A duplicate inherits the copy, never the slot: two posts must not race
      // for the same publish time by accident.
      scheduledAt: undefined,
      publishedAt: undefined,
      authorId: user.userId,
      content: source.content.map((variant) => ({ ...variant, hashtags: [...(variant.hashtags ?? [])] })),
      mediaIds: [...source.mediaIds],
      createdAt: now,
      updatedAt: now
    };

    const saved = this.postsRepository.save(copy);
    this.audit(user, saved, "post.duplicated", { sourceId: source.id }, { status: "draft" });
    return saved;
  }

  /**
   * Archives a post. Content is retained because audit and analytics both
   * reference it; only published posts are refused, since archiving one would
   * misrepresent what actually went out.
   */
  archive(id: string, user: Principal): Post {
    const post = this.findOne(id, user.workspaceId);
    if (post.status === "archived") {
      return post;
    }
    if (post.status === "publishing") {
      throw new ConflictException("A post that is publishing cannot be archived");
    }

    const before = { status: post.status };
    const archived = this.postsRepository.save({
      ...post,
      status: "archived",
      updatedAt: new Date().toISOString()
    });

    this.audit(user, archived, "post.archived", before, { status: "archived" });
    return archived;
  }

  /** Preflight validation used by the composer; performs no writes. */
  validate(input: ValidatePostDto) {
    return validatePost({
      content: input.content,
      scheduledAt: input.scheduledAt,
      mediaCount: input.mediaCount ?? 0
    });
  }

  /**
   * Enforces the shared platform rules.
   *
   * A draft is allowed to be incomplete: someone writes the copy first and
   * attaches the image later, and blocking that would make the composer refuse
   * to save work in progress. The media requirement therefore only bites once
   * the post is actually heading for a channel.
   */
  private assertContentValid(
    content: Array<{ platform: Platform; text: string; hashtags?: string[]; firstComment?: string; link?: string }>,
    scheduledAt: string | undefined,
    mediaCount: number,
    options: { requireMedia: boolean }
  ): void {
    const result = validatePost({ content, scheduledAt, mediaCount });
    const errors = result.issues.filter(
      (issue) =>
        issue.severity === "error" && (options.requireMedia || issue.code !== "media_required")
    );
    if (errors.length > 0) {
      throw new BadRequestException({
        message: errors.map((issue) => `${issue.platform}: ${issue.message}`).join(" "),
        code: "post_invalid",
        details: { issues: errors }
      });
    }
  }

  private audit(
    user: Principal | undefined,
    post: Post,
    action: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>
  ): void {
    if (!user) return;
    this.auditService.record({
      workspaceId: post.workspaceId,
      userId: user.userId,
      action,
      entityType: "post",
      entityId: post.id,
      oldValues,
      newValues
    });
  }

  /** Guards a cross-workspace write attempt with an explicit refusal. */
  assertWorkspace(post: Post, user: Principal): void {
    if (post.workspaceId !== user.workspaceId) {
      throw new ForbiddenException("Post belongs to another workspace");
    }
  }
}

function sortValue(post: Post, field: string): string {
  switch (field) {
    case "createdAt":
      return post.createdAt;
    case "updatedAt":
      return post.updatedAt;
    case "status":
      return post.status;
    default:
      return post.scheduledAt ?? post.createdAt;
  }
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const bucket = key(item);
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});
}
