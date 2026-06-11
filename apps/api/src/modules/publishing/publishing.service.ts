import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoPosts,
  demoPublishingJobs,
  demoSocialAccounts,
  type Platform,
  type PublishingJob,
  type SocialAccount
} from "@ssm/domain";
import type { EnqueuePublishingJobsDto } from "./dto.js";
import { deterministicConnectors } from "./platform-connectors.js";

@Injectable()
export class PublishingService {
  private readonly jobs: PublishingJob[] = [...demoPublishingJobs];

  listJobs(workspaceId: string) {
    return this.jobs
      .filter((job) => job.workspaceId === workspaceId)
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  }

  enqueue(input: EnqueuePublishingJobsDto) {
    const post = demoPosts.find(
      (item) => item.id === input.postId && item.workspaceId === input.workspaceId
    );
    if (!post) {
      throw new NotFoundException("Post not found");
    }

    const scheduledFor = input.publishAt ?? post.scheduledAt ?? new Date().toISOString();
    const platformTargets = new Set(post.content.map((variant) => variant.platform));
    const accounts = demoSocialAccounts.filter((account) => {
      const accountSelected =
        !input.socialAccountIds?.length || input.socialAccountIds.includes(account.id);
      return (
        account.workspaceId === input.workspaceId &&
        accountSelected &&
        platformTargets.has(account.platform)
      );
    });

    if (accounts.length === 0) {
      throw new BadRequestException("No matching social accounts for post platforms");
    }

    const created = accounts.map((account) => this.upsertJob(input.workspaceId, post.id, account, scheduledFor));
    return {
      postId: post.id,
      created: created.filter((job) => job.status === "queued" && job.attempts === 0),
      jobs: created
    };
  }

  async processDue(workspaceId: string) {
    const now = new Date().toISOString();
    const dueJobs = this.jobs.filter(
      (job) =>
        job.workspaceId === workspaceId &&
        ["queued", "retrying"].includes(job.status) &&
        job.scheduledFor <= now &&
        (!job.nextRetryAt || job.nextRetryAt <= now)
    );

    const results = [];
    for (const job of dueJobs) {
      results.push(await this.processJob(job.id));
    }

    return {
      processed: results.length,
      jobs: results
    };
  }

  async processJob(id: string) {
    const job = this.findJob(id);
    if (job.status === "succeeded" || job.status === "canceled") {
      return job;
    }

    const account = demoSocialAccounts.find((item) => item.id === job.socialAccountId);
    if (!account) {
      return this.fail(job, "Social account no longer exists.");
    }
    if (account.status !== "connected") {
      return this.fail(job, "Social account is not connected.");
    }

    job.status = "processing";
    job.lockedAt = new Date().toISOString();
    job.updatedAt = job.lockedAt;

    const connector = deterministicConnectors[job.platform];
    const result = await connector.publish(job);
    const completedAt = new Date().toISOString();
    job.status = "succeeded";
    job.attempts += 1;
    job.platformPostId = result.platformPostId;
    job.platformPostUrl = result.platformPostUrl;
    job.completedAt = completedAt;
    job.updatedAt = completedAt;
    job.lastError = undefined;
    job.nextRetryAt = undefined;

    return job;
  }

  retry(id: string) {
    const job = this.findJob(id);
    if (job.status !== "failed") {
      throw new BadRequestException("Only failed jobs can be retried");
    }
    if (job.attempts >= job.maxAttempts) {
      throw new BadRequestException("Maximum retry attempts reached");
    }

    const nextRetryAt = new Date(Date.now() + this.retryDelayMs(job.attempts)).toISOString();
    job.status = "retrying";
    job.nextRetryAt = nextRetryAt;
    job.updatedAt = new Date().toISOString();
    return job;
  }

  private upsertJob(
    workspaceId: string,
    postId: string,
    account: SocialAccount,
    scheduledFor: string
  ): PublishingJob {
    const idempotencyKey = this.idempotencyKey(postId, account.id, account.platform, scheduledFor);
    const existing = this.jobs.find((job) => job.idempotencyKey === idempotencyKey);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const job: PublishingJob = {
      id: randomUUID(),
      workspaceId,
      postId,
      socialAccountId: account.id,
      platform: account.platform,
      status: "queued",
      idempotencyKey,
      scheduledFor,
      attempts: 0,
      maxAttempts: 5,
      createdAt: now,
      updatedAt: now
    };
    this.jobs.push(job);
    return job;
  }

  private fail(job: PublishingJob, reason: string) {
    const now = new Date().toISOString();
    job.attempts += 1;
    job.status = "failed";
    job.lastError = reason;
    job.nextRetryAt = job.attempts < job.maxAttempts ? new Date(Date.now() + this.retryDelayMs(job.attempts)).toISOString() : undefined;
    job.updatedAt = now;
    return job;
  }

  private findJob(id: string): PublishingJob {
    const job = this.jobs.find((item) => item.id === id);
    if (!job) {
      throw new NotFoundException("Publishing job not found");
    }
    return job;
  }

  private retryDelayMs(attempts: number): number {
    return Math.min(60_000 * 2 ** Math.max(attempts - 1, 0), 15 * 60_000);
  }

  private idempotencyKey(
    postId: string,
    socialAccountId: string,
    platform: Platform,
    scheduledFor: string
  ): string {
    return `${postId}:${socialAccountId}:${platform}:${scheduledFor}`;
  }
}
