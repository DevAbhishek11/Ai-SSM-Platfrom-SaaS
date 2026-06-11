import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoAnalytics,
  demoScheduleRules,
  demoScheduleSlots,
  demoUser,
  demoWorkspace,
  type Platform,
  type ScheduleRule,
  type ScheduleRuleStatus,
  type ScheduleSlot
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import { PostsRepository } from "../repositories/posts.repository.js";
import { PublishingService } from "../publishing/publishing.service.js";
import type {
  CreateScheduleRuleDto,
  RecommendScheduleSlotsDto,
  ReserveScheduleSlotDto,
  ScheduleWindowDto
} from "./dto.js";

@Injectable()
export class SchedulingService {
  private readonly rules: ScheduleRule[] = demoScheduleRules.map((rule) => ({
    ...rule,
    platforms: [...rule.platforms],
    windows: rule.windows.map((window) => ({ ...window }))
  }));
  private readonly slots: ScheduleSlot[] = demoScheduleSlots.map((slot) => ({
    ...slot,
    metadata: { ...slot.metadata }
  }));

  constructor(
    private readonly auditService: AuditService,
    private readonly postsRepository: PostsRepository,
    private readonly publishingService: PublishingService
  ) {}

  listRules(workspaceId = demoWorkspace.id, status?: ScheduleRuleStatus) {
    return this.rules
      .filter((rule) => rule.workspaceId === workspaceId)
      .filter((rule) => !status || rule.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createRule(input: CreateScheduleRuleDto, actor?: Principal) {
    const name = input.name.trim();
    const existing = this.rules.find(
      (rule) =>
        rule.workspaceId === input.workspaceId &&
        rule.name.toLowerCase() === name.toLowerCase() &&
        rule.status !== "archived"
    );
    if (existing) {
      throw new BadRequestException("An enabled schedule rule already exists with this name");
    }

    const now = new Date().toISOString();
    const rule: ScheduleRule = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name,
      platforms: [...new Set(input.platforms)],
      timezone: input.timezone,
      windows: input.windows.map((window) => ({ ...window })),
      minGapMinutes: input.minGapMinutes ?? 120,
      maxPostsPerDay: input.maxPostsPerDay ?? 3,
      status: input.status ?? "active",
      createdBy: actor?.userId ?? demoUser.id,
      createdAt: now,
      updatedAt: now
    };

    this.rules.unshift(rule);
    this.auditService.record({
      workspaceId: rule.workspaceId,
      userId: actor?.userId,
      action: "scheduling.rule_created",
      entityType: "schedule_rule",
      entityId: rule.id,
      newValues: {
        name: rule.name,
        platforms: rule.platforms,
        windows: rule.windows.length
      }
    });
    return rule;
  }

  listSlots(workspaceId = demoWorkspace.id, status?: ScheduleSlot["status"]) {
    return this.slots
      .filter((slot) => slot.workspaceId === workspaceId)
      .filter((slot) => !status || slot.status === status)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  recommendSlots(input: RecommendScheduleSlotsDto, actor?: Principal) {
    const desiredPlatforms = new Set(input.platforms ?? []);
    const rules = this.rules
      .filter((rule) => rule.workspaceId === input.workspaceId && rule.status === "active")
      .filter((rule) => desiredPlatforms.size === 0 || rule.platforms.some((platform) => desiredPlatforms.has(platform)));

    if (rules.length === 0) {
      throw new BadRequestException("No active schedule rules match the requested platforms");
    }

    const count = input.count ?? 4;
    const generated: ScheduleSlot[] = [];
    let cursor = new Date(input.earliestAt ?? Date.now() + 24 * 60 * 60_000);

    while (generated.length < count) {
      for (const rule of rules) {
        const platforms = rule.platforms.filter(
          (platform) => desiredPlatforms.size === 0 || desiredPlatforms.has(platform)
        );
        for (const platform of platforms) {
          const window = rule.windows[generated.length % rule.windows.length];
          if (!window) {
            continue;
          }
          const startsAt = this.nextWindowStart(cursor, window);
          const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
          const slot: ScheduleSlot = {
            id: randomUUID(),
            workspaceId: input.workspaceId,
            ruleId: rule.id,
            campaignId: input.campaignId,
            platform,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            score: this.scoreSlot(platform, generated.length),
            status: "recommended",
            reason: this.reasonFor(platform, rule),
            metadata: {
              ruleName: rule.name,
              timezone: rule.timezone,
              minGapMinutes: rule.minGapMinutes
            },
            createdAt: new Date().toISOString()
          };
          this.slots.unshift(slot);
          generated.push(slot);
          cursor = new Date(startsAt.getTime() + rule.minGapMinutes * 60_000);
          if (generated.length >= count) {
            break;
          }
        }
        if (generated.length >= count) {
          break;
        }
      }
      cursor = new Date(cursor.getTime() + 24 * 60 * 60_000);
    }

    this.auditService.record({
      workspaceId: input.workspaceId,
      userId: actor?.userId,
      action: "scheduling.slots_recommended",
      entityType: "schedule_slot",
      newValues: {
        count: generated.length,
        platforms: [...new Set(generated.map((slot) => slot.platform))],
        ruleIds: [...new Set(generated.map((slot) => slot.ruleId).filter(Boolean))]
      }
    });

    return {
      generated,
      rulesConsidered: rules.length
    };
  }

  reserveSlot(id: string, input: ReserveScheduleSlotDto, actor?: Principal) {
    const slot = this.findSlot(id);
    if (slot.status !== "recommended") {
      throw new BadRequestException("Only recommended slots can be reserved");
    }

    let enqueueResult: unknown;
    if (input.postId) {
      const post = this.postsRepository.findById(input.postId);
      if (!post || post.workspaceId !== slot.workspaceId) {
        throw new NotFoundException("Post not found");
      }
      if (!post.content.some((variant) => variant.platform === slot.platform)) {
        throw new BadRequestException("Post does not target the slot platform");
      }

      post.status = "scheduled";
      post.scheduledAt = slot.startsAt;
      post.updatedAt = new Date().toISOString();
      this.postsRepository.save(post);
      enqueueResult = this.publishingService.enqueue(
        {
          workspaceId: slot.workspaceId,
          postId: post.id,
          publishAt: slot.startsAt
        },
        actor
      );
    }

    const now = new Date().toISOString();
    slot.status = "reserved";
    slot.campaignId = input.campaignId ?? slot.campaignId;
    slot.reservedBy = actor?.userId ?? demoUser.id;
    slot.reservedAt = now;
    slot.metadata = {
      ...slot.metadata,
      ...input.metadata,
      postId: input.postId
    };

    this.auditService.record({
      workspaceId: slot.workspaceId,
      userId: actor?.userId,
      action: "scheduling.slot_reserved",
      entityType: "schedule_slot",
      entityId: slot.id,
      newValues: {
        platform: slot.platform,
        startsAt: slot.startsAt,
        postId: input.postId,
        campaignId: slot.campaignId
      }
    });

    return {
      slot,
      enqueueResult
    };
  }

  private findSlot(id: string) {
    const slot = this.slots.find((item) => item.id === id);
    if (!slot) {
      throw new NotFoundException("Schedule slot not found");
    }
    return slot;
  }

  private nextWindowStart(cursor: Date, window: ScheduleWindowDto) {
    const next = new Date(cursor);
    const currentDay = next.getUTCDay();
    const daysUntil = (window.dayOfWeek - currentDay + 7) % 7;
    next.setUTCDate(next.getUTCDate() + daysUntil);
    const [hour, minute] = window.startTime.split(":").map(Number);
    next.setUTCHours(hour ?? 9, minute ?? 0, 0, 0);
    if (next.getTime() <= cursor.getTime()) {
      next.setUTCDate(next.getUTCDate() + 7);
    }
    return next;
  }

  private scoreSlot(platform: Platform, offset: number) {
    const snapshot = demoAnalytics.find((item) => item.platform === platform);
    const engagementRate = snapshot
      ? snapshot.metrics.engagements / Math.max(snapshot.metrics.impressions, 1)
      : 0.04;
    return Math.min(98, Math.round(72 + engagementRate * 250 + Math.max(0, 8 - offset)));
  }

  private reasonFor(platform: Platform, rule: ScheduleRule) {
    return `${platform} is recommended by ${rule.name} using recent engagement history and workspace publishing gaps.`;
  }
}
