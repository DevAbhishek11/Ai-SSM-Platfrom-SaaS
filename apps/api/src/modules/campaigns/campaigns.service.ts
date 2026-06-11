import { randomUUID } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import {
  demoAnalytics,
  demoCampaignBudgetLines,
  demoCampaignMilestones,
  demoCampaignReports,
  demoCampaignTasks,
  demoCampaigns,
  demoPosts,
  type Campaign,
  type CampaignBudgetLine,
  type CampaignMilestone,
  type CampaignReport,
  type CampaignTask
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import type {
  CreateCampaignTaskDto,
  GenerateCampaignReportDto,
  UpdateCampaignTaskStatusDto,
  UpsertCampaignBudgetLineDto
} from "./dto.js";

@Injectable()
export class CampaignsService {
  private readonly campaigns: Campaign[] = [...demoCampaigns];
  private readonly milestones: CampaignMilestone[] = [...demoCampaignMilestones];
  private readonly tasks: CampaignTask[] = demoCampaignTasks.map((task) => ({
    ...task,
    metadata: { ...task.metadata }
  }));
  private readonly budgetLines: CampaignBudgetLine[] = [...demoCampaignBudgetLines];
  private readonly reports: CampaignReport[] = demoCampaignReports.map((report) => ({
    ...report,
    metrics: { ...report.metrics },
    insights: [...report.insights]
  }));

  constructor(private readonly auditService: AuditService) {}

  list(workspaceId: string) {
    return this.campaigns
      .filter((campaign) => campaign.workspaceId === workspaceId)
      .map((campaign) => this.withSummary(campaign));
  }

  get(id: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    return campaign ? this.withSummary(campaign) : undefined;
  }

  listMilestones(campaignId: string) {
    this.findCampaign(campaignId);
    return this.milestones
      .filter((milestone) => milestone.campaignId === campaignId)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  completeMilestone(milestoneId: string, actor?: Principal) {
    const milestone = this.findMilestone(milestoneId);
    if (milestone.status === "completed") {
      return milestone;
    }

    const now = new Date().toISOString();
    const previous = { status: milestone.status, completedAt: milestone.completedAt };
    milestone.status = "completed";
    milestone.completedAt = now;
    milestone.updatedAt = now;

    this.auditService.record({
      workspaceId: milestone.workspaceId,
      userId: actor?.userId,
      action: "campaigns.milestone_completed",
      entityType: "campaign_milestone",
      entityId: milestone.id,
      oldValues: previous,
      newValues: { status: milestone.status, completedAt: milestone.completedAt }
    });

    return milestone;
  }

  listTasks(campaignId: string) {
    this.findCampaign(campaignId);
    return this.tasks
      .filter((task) => task.campaignId === campaignId)
      .sort((a, b) => a.dueDate?.localeCompare(b.dueDate ?? "") ?? 1);
  }

  createTask(campaignId: string, input: CreateCampaignTaskDto, actor?: Principal) {
    const campaign = this.findCampaign(campaignId);
    const now = new Date().toISOString();
    const task: CampaignTask = {
      id: randomUUID(),
      workspaceId: campaign.workspaceId,
      campaignId,
      title: input.title.trim(),
      status: "todo",
      priority: input.priority ?? "normal",
      assigneeId: input.assigneeId ?? actor?.userId,
      dueDate: input.dueDate,
      metadata: input.metadata ? { ...input.metadata } : {},
      createdAt: now,
      updatedAt: now
    };

    this.tasks.unshift(task);
    this.auditService.record({
      workspaceId: task.workspaceId,
      userId: actor?.userId,
      action: "campaigns.task_created",
      entityType: "campaign_task",
      entityId: task.id,
      newValues: {
        campaignId,
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate
      }
    });

    return task;
  }

  updateTaskStatus(taskId: string, input: UpdateCampaignTaskStatusDto, actor?: Principal) {
    const task = this.findTask(taskId);
    const now = new Date().toISOString();
    const previous = { status: task.status, completedAt: task.completedAt };
    task.status = input.status;
    task.completedAt = input.status === "done" ? now : undefined;
    task.updatedAt = now;

    this.auditService.record({
      workspaceId: task.workspaceId,
      userId: actor?.userId,
      action: "campaigns.task_status_updated",
      entityType: "campaign_task",
      entityId: task.id,
      oldValues: previous,
      newValues: { status: task.status, completedAt: task.completedAt }
    });

    return task;
  }

  getBudget(campaignId: string) {
    this.findCampaign(campaignId);
    return this.budgetSummary(campaignId);
  }

  upsertBudgetLine(campaignId: string, input: UpsertCampaignBudgetLineDto, actor?: Principal) {
    const campaign = this.findCampaign(campaignId);
    const now = new Date().toISOString();
    const category = input.category.trim();
    const existing = this.budgetLines.find(
      (line) =>
        line.campaignId === campaignId &&
        line.category.toLocaleLowerCase() === category.toLocaleLowerCase()
    );

    if (existing) {
      const previous = {
        allocated: existing.allocated,
        spent: existing.spent,
        currency: existing.currency
      };
      existing.allocated = input.allocated;
      existing.spent = input.spent;
      existing.currency = (input.currency ?? existing.currency).toUpperCase();
      existing.updatedAt = now;
      this.auditService.record({
        workspaceId: existing.workspaceId,
        userId: actor?.userId,
        action: "campaigns.budget_line_updated",
        entityType: "campaign_budget_line",
        entityId: existing.id,
        oldValues: previous,
        newValues: {
          allocated: existing.allocated,
          spent: existing.spent,
          currency: existing.currency
        }
      });
      return existing;
    }

    const line: CampaignBudgetLine = {
      id: randomUUID(),
      workspaceId: campaign.workspaceId,
      campaignId,
      category,
      allocated: input.allocated,
      spent: input.spent,
      currency: (input.currency ?? "USD").toUpperCase(),
      createdAt: now,
      updatedAt: now
    };
    this.budgetLines.unshift(line);
    this.auditService.record({
      workspaceId: line.workspaceId,
      userId: actor?.userId,
      action: "campaigns.budget_line_created",
      entityType: "campaign_budget_line",
      entityId: line.id,
      newValues: {
        campaignId,
        category: line.category,
        allocated: line.allocated,
        spent: line.spent,
        currency: line.currency
      }
    });

    return line;
  }

  listReports(campaignId: string) {
    this.findCampaign(campaignId);
    return this.reports
      .filter((report) => report.campaignId === campaignId)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  generateReport(campaignId: string, input: GenerateCampaignReportDto = {}, actor?: Principal) {
    const campaign = this.findCampaign(campaignId);
    const posts = demoPosts.filter((post) => post.campaignId === campaignId);
    const analytics = demoAnalytics.filter(
      (snapshot) => !snapshot.postId || posts.some((post) => post.id === snapshot.postId)
    );
    const impressions = analytics.reduce((total, snapshot) => total + snapshot.metrics.impressions, 0);
    const engagements = analytics.reduce((total, snapshot) => total + snapshot.metrics.engagements, 0);
    const conversions = analytics.reduce((total, snapshot) => total + snapshot.metrics.conversions, 0);
    const budget = this.budgetSummary(campaignId);
    const spend = budget.spent;
    const generatedAt = new Date().toISOString();
    const report: CampaignReport = {
      id: randomUUID(),
      workspaceId: campaign.workspaceId,
      campaignId,
      title: `${campaign.name} campaign report`,
      status: "generated",
      periodStart: input.periodStart ?? campaign.startDate,
      periodEnd: input.periodEnd ?? campaign.endDate ?? new Date().toISOString().slice(0, 10),
      metrics: {
        posts: posts.length,
        published: posts.filter((post) => post.status === "published").length,
        scheduled: posts.filter((post) => post.status === "scheduled").length,
        impressions,
        engagements,
        conversions,
        spend,
        roi: spend > 0 ? Number(((conversions * 120) / spend).toFixed(2)) : 0,
        engagementRate: impressions > 0 ? Number((engagements / impressions).toFixed(4)) : 0
      },
      insights: this.reportInsights(campaignId, spend),
      generatedAt
    };

    this.reports.unshift(report);
    this.auditService.record({
      workspaceId: report.workspaceId,
      userId: actor?.userId,
      action: "campaigns.report_generated",
      entityType: "campaign_report",
      entityId: report.id,
      newValues: {
        campaignId,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        metrics: report.metrics
      }
    });

    return report;
  }

  private withSummary(campaign: Campaign) {
    const posts = demoPosts.filter((post) => post.campaignId === campaign.id);
    const milestones = this.milestones.filter((milestone) => milestone.campaignId === campaign.id);
    const tasks = this.tasks.filter((task) => task.campaignId === campaign.id);
    const budget = this.budgetSummary(campaign.id);
    const latestReport = this.reports
      .filter((report) => report.campaignId === campaign.id)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];

    return {
      ...campaign,
      summary: {
        posts: posts.length,
        scheduled: posts.filter((post) => post.status === "scheduled").length,
        inReview: posts.filter((post) => post.status === "in_review").length,
        aiGenerated: posts.filter((post) => post.aiGenerated).length,
        milestones: milestones.length,
        completedMilestones: milestones.filter((milestone) => milestone.status === "completed").length,
        atRiskMilestones: milestones.filter((milestone) => milestone.status === "at_risk").length,
        tasks: tasks.length,
        blockedTasks: tasks.filter((task) => task.status === "blocked").length,
        completedTasks: tasks.filter((task) => task.status === "done").length,
        budgetAllocated: budget.allocated,
        budgetSpent: budget.spent,
        budgetRemaining: budget.remaining,
        latestReport
      }
    };
  }

  private budgetSummary(campaignId: string) {
    const lines = this.budgetLines.filter((line) => line.campaignId === campaignId);
    const allocated = lines.reduce((total, line) => total + line.allocated, 0);
    const spent = lines.reduce((total, line) => total + line.spent, 0);
    return {
      campaignId,
      allocated,
      spent,
      remaining: Math.max(allocated - spent, 0),
      utilization: allocated > 0 ? Number((spent / allocated).toFixed(4)) : 0,
      lines
    };
  }

  private reportInsights(campaignId: string, spend: number) {
    const milestones = this.milestones.filter((milestone) => milestone.campaignId === campaignId);
    const tasks = this.tasks.filter((task) => task.campaignId === campaignId);
    const insights = [
      `${tasks.filter((task) => task.status === "done").length} of ${tasks.length} campaign tasks are complete.`,
      `${milestones.filter((milestone) => milestone.status === "completed").length} of ${milestones.length} milestones are complete.`
    ];

    if (tasks.some((task) => task.status === "blocked")) {
      insights.push("Blocked tasks should be cleared before the next scheduled publishing window.");
    }
    if (milestones.some((milestone) => milestone.status === "at_risk")) {
      insights.push("At-risk milestones need owner review to protect the campaign launch date.");
    }
    if (spend > 0) {
      insights.push("Budget pacing is available for executive reporting and spend reviews.");
    }

    return insights;
  }

  private findCampaign(id: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }

  private findMilestone(id: string) {
    const milestone = this.milestones.find((item) => item.id === id);
    if (!milestone) {
      throw new NotFoundException("Campaign milestone not found");
    }
    return milestone;
  }

  private findTask(id: string) {
    const task = this.tasks.find((item) => item.id === id);
    if (!task) {
      throw new NotFoundException("Campaign task not found");
    }
    return task;
  }
}
