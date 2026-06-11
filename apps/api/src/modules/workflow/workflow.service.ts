import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoPostComments,
  demoWorkflowEvents,
  type Post,
  type PostComment,
  type PostStatus,
  type WorkflowEvent,
  type WorkflowEventAction
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
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
