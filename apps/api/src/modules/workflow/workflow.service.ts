import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  validatePost,
  demoPostComments,
  demoWorkflowEvents,
  type Post,
  type PostComment,
  type PostStatus,
  type WorkflowEvent,
  type WorkflowEventAction
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import type { BulkWorkflowAction } from "./dto.js";
import { AuditService } from "../audit/audit.service.js";
import { PostsRepository } from "../repositories/posts.repository.js";

const allowedTransitions: Record<PostStatus, PostStatus[]> = {
  draft: ["in_review", "archived"],
  in_review: ["approved", "revisions_needed", "archived"],
  revisions_needed: ["draft", "in_review", "archived"],
  approved: ["scheduled", "archived"],
  scheduled: ["publishing", "approved", "archived"],
  publishing: ["published", "failed"],
  published: ["archived"],
  failed: ["scheduled", "archived"],
  archived: []
};

@Injectable()
export class WorkflowService {
  private readonly comments: PostComment[] = [...demoPostComments];
  private readonly events: WorkflowEvent[] = [...demoWorkflowEvents];

  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly auditService: AuditService
  ) {}

  timeline(postId: string) {
    const post = this.getPost(postId);
    return {
      post,
      comments: this.comments
        .filter((comment) => comment.postId === postId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      events: this.events
        .filter((event) => event.postId === postId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    };
  }

  transition(
    postId: string,
    toStatus: PostStatus,
    user: Principal,
    action: WorkflowEventAction,
    comment?: string
  ) {
    const post = this.getPost(postId);
    this.assertTransition(post.status, toStatus);

    const fromStatus = post.status;
    const updatedAt = new Date().toISOString();
    post.status = toStatus;
    post.updatedAt = updatedAt;
    if (toStatus !== "scheduled") {
      post.scheduledAt = toStatus === "approved" && action === "canceled" ? undefined : post.scheduledAt;
    }
    this.postsRepository.save(post);

    const event = this.recordEvent({
      post,
      actorId: user.userId,
      action,
      fromStatus,
      toStatus,
      comment
    });

    if (comment) {
      this.addComment(post, user.userId, comment);
    }

    this.auditService.record({
      workspaceId: post.workspaceId,
      userId: user.userId,
      action: `workflow.${action}`,
      entityType: "post",
      entityId: post.id,
      oldValues: { status: fromStatus },
      newValues: { status: toStatus, comment }
    });

    return {
      post,
      event,
      timeline: this.timeline(postId)
    };
  }

  schedule(postId: string, scheduledAt: string, user: Principal, comment?: string) {
    const post = this.getPost(postId);
    this.assertTransition(post.status, "scheduled");
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      throw new BadRequestException("scheduledAt must be in the future");
    }

    // Drafts are allowed to be incomplete, but a scheduled post is a promise to
    // a channel: this is the last point at which a missing image or an
    // over-length caption can be caught before the publisher fails at 6am.
    const validation = validatePost({
      content: post.content,
      mediaCount: post.mediaIds.length
    });
    const blocking = validation.issues.filter((issue) => issue.severity === "error");
    if (blocking.length > 0) {
      throw new BadRequestException({
        message: blocking.map((issue) => `${issue.platform}: ${issue.message}`).join(" "),
        code: "post_invalid",
        details: { issues: blocking }
      });
    }

    const fromStatus = post.status;
    const updatedAt = new Date().toISOString();
    post.status = "scheduled";
    post.scheduledAt = scheduledAt;
    post.updatedAt = updatedAt;
    this.postsRepository.save(post);

    const event = this.recordEvent({
      post,
      actorId: user.userId,
      action: "scheduled",
      fromStatus,
      toStatus: "scheduled",
      comment,
      metadata: { scheduledAt }
    });

    if (comment) {
      this.addComment(post, user.userId, comment);
    }

    this.auditService.record({
      workspaceId: post.workspaceId,
      userId: user.userId,
      action: "workflow.scheduled",
      entityType: "post",
      entityId: post.id,
      oldValues: { status: fromStatus, scheduledAt: undefined },
      newValues: { status: "scheduled", scheduledAt, comment }
    });

    return {
      post,
      event,
      timeline: this.timeline(postId)
    };
  }

  /**
   * Applies one action across many posts.
   *
   * Partial success is the norm here - a reviewer selects twelve posts and two
   * of them moved on since the list was rendered - so a failure on one item
   * must not roll back or hide the eleven that worked. Every id gets its own
   * outcome and the caller decides what to surface.
   */
  bulk(
    postIds: string[],
    action: BulkWorkflowAction,
    user: Principal,
    comment?: string
  ): {
    action: BulkWorkflowAction;
    requested: number;
    succeeded: number;
    failed: number;
    results: Array<{ postId: string; ok: boolean; status?: PostStatus; error?: string }>;
  } {
    const unique = [...new Set(postIds)];
    const results = unique.map((postId) => {
      try {
        const post = this.applyBulkAction(postId, action, user, comment);
        return { postId, ok: true, status: post.status };
      } catch (error) {
        return {
          postId,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    });

    return {
      action,
      requested: unique.length,
      succeeded: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      results
    };
  }

  private applyBulkAction(
    postId: string,
    action: BulkWorkflowAction,
    user: Principal,
    comment?: string
  ): Post {
    switch (action) {
      case "submit":
        return this.transition(postId, "in_review", user, "submitted_for_review", comment).post;
      case "approve":
        return this.transition(postId, "approved", user, "approved", comment).post;
      case "request_changes":
        return this.transition(postId, "revisions_needed", user, "changes_requested", comment).post;
      case "cancel":
        return this.transition(postId, "approved", user, "canceled", comment).post;
      case "archive":
        return this.transition(postId, "archived", user, "archived", comment).post;
      default: {
        // Exhaustiveness guard: adding an action without handling it fails to compile.
        const exhaustive: never = action;
        throw new BadRequestException(`Unsupported bulk action ${String(exhaustive)}`);
      }
    }
  }

  /** Adds a standalone review comment without moving the post. */
  comment(postId: string, body: string, user: Principal): PostComment {
    const post = this.getPost(postId);
    if (post.workspaceId !== user.workspaceId) {
      throw new NotFoundException("Post not found");
    }

    const comment = this.addComment(post, user.userId, body);
    this.recordEvent({ post, actorId: user.userId, action: "commented", comment: body });
    this.auditService.record({
      workspaceId: post.workspaceId,
      userId: user.userId,
      action: "workflow.commented",
      entityType: "post",
      entityId: post.id,
      newValues: { commentId: comment.id }
    });

    return comment;
  }

  /** Marks a review comment as handled so the thread can be closed out. */
  resolveComment(commentId: string, user: Principal): PostComment {
    const comment = this.comments.find((item) => item.id === commentId);
    if (!comment || comment.workspaceId !== user.workspaceId) {
      throw new NotFoundException("Comment not found");
    }

    comment.resolved = true;
    comment.updatedAt = new Date().toISOString();
    return comment;
  }

  private getPost(postId: string): Post {
    const post = this.postsRepository.findById(postId);
    if (!post) {
      throw new NotFoundException("Post not found");
    }
    return post;
  }

  private assertTransition(from: PostStatus, to: PostStatus): void {
    if (!allowedTransitions[from].includes(to)) {
      throw new BadRequestException(`Cannot transition post from ${from} to ${to}`);
    }
  }

  private recordEvent({
    post,
    actorId,
    action,
    fromStatus,
    toStatus,
    comment,
    metadata = {}
  }: {
    post: Post;
    actorId: string;
    action: WorkflowEventAction;
    fromStatus?: PostStatus;
    toStatus?: PostStatus;
    comment?: string;
    metadata?: Record<string, unknown>;
  }): WorkflowEvent {
    const event: WorkflowEvent = {
      id: randomUUID(),
      postId: post.id,
      workspaceId: post.workspaceId,
      actorId,
      action,
      fromStatus,
      toStatus,
      comment,
      metadata,
      createdAt: new Date().toISOString()
    };
    this.events.push(event);
    return event;
  }

  private addComment(post: Post, authorId: string, body: string): PostComment {
    const now = new Date().toISOString();
    const comment: PostComment = {
      id: randomUUID(),
      postId: post.id,
      workspaceId: post.workspaceId,
      authorId,
      body,
      resolved: false,
      createdAt: now,
      updatedAt: now
    };
    this.comments.push(comment);
    return comment;
  }
}
