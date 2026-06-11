import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoContentSafetyChecks,
  demoModerationQueueItems,
  demoSafetyPolicies,
  demoUser,
  demoWorkspace,
  type ContentSafetyCheck,
  type ModerationQueueItem,
  type ModerationStatus,
  type SafetyPolicy,
  type SafetySeverity
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import type { CreateSafetyPolicyDto, EvaluateContentSafetyDto, ResolveModerationItemDto } from "./dto.js";

const safetyPatterns = [
  {
    label: "possible_pii_email",
    pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    score: 0.22,
    recommendation: "Remove personal email addresses or replace them with approved contact channels."
  },
  {
    label: "possible_payment_card",
    pattern: /\b(?:\d[ -]*?){13,16}\b/,
    score: 0.48,
    recommendation: "Remove payment card-like numbers before publishing."
  },
  {
    label: "medical_claim",
    pattern: /\b(cure|guaranteed treatment|diagnose)\b/i,
    score: 0.48,
    recommendation: "Avoid medical diagnosis or treatment claims without compliance approval."
  },
  {
    label: "financial_claim",
    pattern: /\b(guaranteed return|risk-free investment)\b/i,
    score: 0.55,
    recommendation: "Remove guaranteed financial outcome claims."
  }
];

@Injectable()
export class SafetyService {
  private readonly policies: SafetyPolicy[] = demoSafetyPolicies.map((policy) => ({
    ...policy,
    rules: {
      blockedTerms: [...policy.rules.blockedTerms],
      requiredDisclosures: [...policy.rules.requiredDisclosures],
      industry: policy.rules.industry,
      maxRiskScore: policy.rules.maxRiskScore
    }
  }));
  private readonly checks: ContentSafetyCheck[] = demoContentSafetyChecks.map((check) => ({
    ...check,
    flags: [...check.flags],
    recommendations: [...check.recommendations]
  }));
  private readonly queue: ModerationQueueItem[] = [...demoModerationQueueItems];

  constructor(private readonly auditService: AuditService) {}

  listPolicies(workspaceId = demoWorkspace.id) {
    return this.policies.filter((policy) => policy.workspaceId === workspaceId);
  }

  createPolicy(input: CreateSafetyPolicyDto, actor?: Principal) {
    const now = new Date().toISOString();
    const policy: SafetyPolicy = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      status: "active",
      rules: {
        blockedTerms: input.rules?.blockedTerms ?? [],
        requiredDisclosures: input.rules?.requiredDisclosures ?? [],
        industry: input.rules?.industry,
        maxRiskScore: input.rules?.maxRiskScore ?? 0.75
      },
      createdBy: actor?.userId ?? demoUser.id,
      createdAt: now,
      updatedAt: now
    };

    this.policies.unshift(policy);
    this.auditService.record({
      workspaceId: policy.workspaceId,
      userId: actor?.userId,
      action: "safety.policy_created",
      entityType: "safety_policy",
      entityId: policy.id,
      newValues: { name: policy.name, rules: policy.rules }
    });

    return policy;
  }

  evaluate(input: EvaluateContentSafetyDto, actor?: Principal) {
    return this.evaluateContent(
      {
        workspaceId: input.workspaceId,
        text: input.text,
        source: input.source ?? "manual",
        sourceEntityId: input.sourceEntityId
      },
      actor
    );
  }

  evaluateContent(
    input: {
      workspaceId: string;
      text: string;
      source: ContentSafetyCheck["source"];
      sourceEntityId?: string;
    },
    actor?: Principal
  ) {
    const policy = this.activePolicy(input.workspaceId);
    const scored = this.scoreText(input.text, policy);
    const maxRiskScore = policy?.rules.maxRiskScore ?? 0.75;
    const status =
      scored.riskScore >= maxRiskScore ? "blocked" : scored.flags.length > 0 ? "flagged" : "passed";
    const now = new Date().toISOString();
    const check: ContentSafetyCheck = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      policyId: policy?.id,
      source: input.source,
      sourceEntityId: input.sourceEntityId,
      text: input.text,
      status,
      severity: scored.severity,
      riskScore: scored.riskScore,
      flags: scored.flags,
      recommendations: scored.recommendations,
      createdAt: now
    };

    this.checks.unshift(check);
    const moderationItem =
      status === "blocked" ? this.createModerationItem(check, "Blocked by AI safety policy.", actor) : undefined;

    this.auditService.record({
      workspaceId: check.workspaceId,
      userId: actor?.userId,
      action: "safety.content_evaluated",
      entityType: "content_safety_check",
      entityId: check.id,
      newValues: {
        source: check.source,
        status: check.status,
        severity: check.severity,
        riskScore: check.riskScore,
        flags: check.flags,
        moderationItemId: moderationItem?.id
      }
    });

    return {
      check,
      moderationItem,
      policy
    };
  }

  listChecks(workspaceId = demoWorkspace.id) {
    return this.checks
      .filter((check) => check.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listModerationQueue(workspaceId = demoWorkspace.id, status?: ModerationStatus) {
    return this.queue
      .filter((item) => item.workspaceId === workspaceId)
      .filter((item) => !status || item.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  resolveModerationItem(id: string, input: ResolveModerationItemDto, actor?: Principal) {
    if (input.status === "open") {
      throw new BadRequestException("Use approved, rejected, or resolved to close a moderation item");
    }
    const item = this.queue.find((entry) => entry.id === id);
    if (!item) {
      throw new NotFoundException("Moderation item not found");
    }

    const previous = { status: item.status, resolutionNote: item.resolutionNote };
    item.status = input.status;
    item.resolutionNote = input.resolutionNote;
    item.updatedAt = new Date().toISOString();

    this.auditService.record({
      workspaceId: item.workspaceId,
      userId: actor?.userId,
      action: "safety.moderation_resolved",
      entityType: "moderation_queue_item",
      entityId: item.id,
      oldValues: previous,
      newValues: { status: item.status, resolutionNote: item.resolutionNote }
    });

    return item;
  }

  private activePolicy(workspaceId: string) {
    return this.policies.find((policy) => policy.workspaceId === workspaceId && policy.status === "active");
  }

  private scoreText(text: string, policy?: SafetyPolicy) {
    const flags: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    for (const rule of safetyPatterns) {
      if (rule.pattern.test(text)) {
        flags.push(rule.label);
        recommendations.push(rule.recommendation);
        riskScore += rule.score;
      }
    }

    for (const term of policy?.rules.blockedTerms ?? []) {
      if (text.toLocaleLowerCase().includes(term.toLocaleLowerCase())) {
        flags.push(`policy_blocked_term:${term}`);
        recommendations.push(`Remove or replace "${term}" before publishing.`);
        riskScore += 0.35;
      }
    }

    const uniqueFlags = [...new Set(flags)];
    const uniqueRecommendations = [...new Set(recommendations)];
    const normalizedRisk = Math.min(Number(riskScore.toFixed(3)), 1);

    return {
      flags: uniqueFlags,
      recommendations: uniqueRecommendations.length
        ? uniqueRecommendations
        : ["No safety issues detected. Continue through the normal approval workflow."],
      riskScore: normalizedRisk,
      severity: this.severityFor(normalizedRisk)
    };
  }

  private severityFor(riskScore: number): SafetySeverity {
    if (riskScore >= 0.85) {
      return "critical";
    }
    if (riskScore >= 0.6) {
      return "high";
    }
    if (riskScore >= 0.3) {
      return "medium";
    }
    return "low";
  }

  private createModerationItem(check: ContentSafetyCheck, reason: string, actor?: Principal) {
    const now = new Date().toISOString();
    const item: ModerationQueueItem = {
      id: randomUUID(),
      workspaceId: check.workspaceId,
      safetyCheckId: check.id,
      source: check.source,
      sourceEntityId: check.sourceEntityId,
      status: "open",
      reason,
      assignedTo: actor?.userId ?? demoUser.id,
      createdAt: now,
      updatedAt: now
    };
    this.queue.unshift(item);
    return item;
  }
}
