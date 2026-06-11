import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoOnboardingSteps,
  demoWorkspace,
  type OnboardingStep
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import type { CompleteOnboardingStepDto, SkipOnboardingStepDto } from "./dto.js";

@Injectable()
export class OnboardingService {
  private readonly steps: OnboardingStep[] = demoOnboardingSteps.map((step) => ({
    ...step,
    metadata: { ...step.metadata }
  }));

  constructor(private readonly auditService: AuditService) {}

  checklist(workspaceId = demoWorkspace.id) {
    const steps = this.steps
      .filter((step) => step.workspaceId === workspaceId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const completed = steps.filter((step) => step.status === "completed").length;
    const skipped = steps.filter((step) => step.status === "skipped").length;
    const actionable = steps.length - skipped;
    const progress = actionable > 0 ? Math.round((completed / actionable) * 100) : 100;

    return {
      workspaceId,
      progress,
      completed,
      skipped,
      total: steps.length,
      nextStep: steps.find((step) => step.status === "in_progress") ?? steps.find((step) => step.status === "pending"),
      steps
    };
  }

  complete(id: string, input: CompleteOnboardingStepDto, actor?: Principal) {
    const step = this.findStep(id);
    if (step.status === "completed") {
      return this.checklist(step.workspaceId);
    }
    if (step.status === "skipped") {
      throw new BadRequestException("Skipped onboarding steps must be reset before completion");
    }

    const now = new Date().toISOString();
    const previousStatus = step.status;
    step.status = "completed";
    step.completedBy = actor?.userId;
    step.completedAt = now;
    step.updatedAt = now;
    step.metadata = { ...step.metadata, ...input.metadata };

    this.auditService.record({
      workspaceId: step.workspaceId,
      userId: actor?.userId,
      action: "onboarding.step_completed",
      entityType: "onboarding_step",
      entityId: step.id,
      oldValues: { status: previousStatus },
      newValues: { key: step.key, status: step.status, progress: this.checklist(step.workspaceId).progress }
    });
    return this.checklist(step.workspaceId);
  }

  skip(id: string, input: SkipOnboardingStepDto, actor?: Principal) {
    const step = this.findStep(id);
    if (step.status === "completed") {
      throw new BadRequestException("Completed onboarding steps cannot be skipped");
    }

    const now = new Date().toISOString();
    const previousStatus = step.status;
    step.status = "skipped";
    step.skippedAt = now;
    step.updatedAt = now;
    step.metadata = { ...step.metadata, skipReason: input.reason };

    this.auditService.record({
      workspaceId: step.workspaceId,
      userId: actor?.userId,
      action: "onboarding.step_skipped",
      entityType: "onboarding_step",
      entityId: step.id,
      oldValues: { status: previousStatus },
      newValues: { key: step.key, status: step.status, reason: input.reason }
    });
    return this.checklist(step.workspaceId);
  }

  private findStep(id: string) {
    const step = this.steps.find((item) => item.id === id);
    if (!step) {
      throw new NotFoundException("Onboarding step not found");
    }
    return step;
  }
}
