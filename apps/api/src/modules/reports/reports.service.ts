import { randomBytes, randomUUID } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import {
  demoAnalytics,
  demoCampaignBudgetLines,
  demoCampaignReports,
  demoCampaigns,
  demoListeningAlerts,
  demoListeningMonitors,
  demoReportExports,
  demoReportShareLinks,
  demoReportTemplates,
  demoScheduledReports,
  demoUser,
  demoWorkspace,
  type ReportExport,
  type ReportShareLink,
  type ReportTemplate,
  type ScheduledReport
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import type {
  CreateReportExportDto,
  CreateReportShareLinkDto,
  CreateReportTemplateDto,
  CreateScheduledReportDto
} from "./dto.js";

@Injectable()
export class ReportsService {
  private readonly templates: ReportTemplate[] = demoReportTemplates.map((template) => ({
    ...template,
    filters: { ...template.filters },
    branding: { ...template.branding }
  }));
  private readonly schedules: ScheduledReport[] = demoScheduledReports.map((schedule) => ({
    ...schedule,
    recipients: [...schedule.recipients]
  }));
  private readonly exports: ReportExport[] = demoReportExports.map((item) => ({
    ...item,
    payload: { ...item.payload }
  }));
  private readonly shareLinks: ReportShareLink[] = [...demoReportShareLinks];

  constructor(private readonly auditService: AuditService) {}

  listTemplates(workspaceId = demoWorkspace.id) {
    return this.templates.filter((template) => template.workspaceId === workspaceId);
  }

  createTemplate(input: CreateReportTemplateDto, actor?: Principal) {
    const now = new Date().toISOString();
    const template: ReportTemplate = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      type: input.type,
      format: input.format,
      filters: input.filters ?? {},
      branding: {
        primaryColor: input.branding?.primaryColor ?? "#0f766e",
        logoUrl: input.branding?.logoUrl,
        footerText: input.branding?.footerText
      },
      createdBy: actor?.userId ?? demoUser.id,
      createdAt: now,
      updatedAt: now
    };
    this.templates.unshift(template);
    this.auditService.record({
      workspaceId: template.workspaceId,
      userId: actor?.userId,
      action: "reports.template_created",
      entityType: "report_template",
      entityId: template.id,
      newValues: { name: template.name, type: template.type, format: template.format }
    });
    return template;
  }

  listSchedules(workspaceId = demoWorkspace.id) {
    return this.schedules.filter((schedule) => schedule.workspaceId === workspaceId);
  }

  createSchedule(input: CreateScheduledReportDto, actor?: Principal) {
    const template = this.findTemplate(input.templateId);
    const now = new Date().toISOString();
    const schedule: ScheduledReport = {
      id: randomUUID(),
      workspaceId: template.workspaceId,
      templateId: template.id,
      frequency: input.frequency,
      recipients: [...new Set(input.recipients)],
      nextRunAt: this.nextRunAt(input.frequency),
      active: true,
      createdBy: actor?.userId ?? demoUser.id,
      createdAt: now,
      updatedAt: now
    };
    this.schedules.unshift(schedule);
    this.auditService.record({
      workspaceId: schedule.workspaceId,
      userId: actor?.userId,
      action: "reports.schedule_created",
      entityType: "scheduled_report",
      entityId: schedule.id,
      newValues: {
        templateId: schedule.templateId,
        frequency: schedule.frequency,
        recipients: schedule.recipients
      }
    });
    return schedule;
  }

  listExports(workspaceId = demoWorkspace.id) {
    return this.exports
      .filter((item) => item.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createExport(input: CreateReportExportDto, actor?: Principal) {
    const template = input.templateId ? this.findTemplate(input.templateId) : undefined;
    const now = new Date();
    const readyAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString();
    const reportExport: ReportExport = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      templateId: template?.id,
      type: input.type,
      format: input.format,
      status: "ready",
      downloadUrl: `https://cdn.example.com/workspaces/${input.workspaceId}/reports/${input.type}-${Date.now()}.${input.format}`,
      payload: this.buildPayload(input.workspaceId, input.type),
      requestedBy: actor?.userId ?? demoUser.id,
      createdAt: readyAt,
      readyAt,
      expiresAt
    };
    this.exports.unshift(reportExport);
    this.auditService.record({
      workspaceId: reportExport.workspaceId,
      userId: actor?.userId,
      action: "reports.export_created",
      entityType: "report_export",
      entityId: reportExport.id,
      newValues: {
        type: reportExport.type,
        format: reportExport.format,
        templateId: reportExport.templateId,
        status: reportExport.status
      }
    });
    return reportExport;
  }

  createShareLink(exportId: string, input: CreateReportShareLinkDto, actor?: Principal) {
    const reportExport = this.findExport(exportId);
    const now = new Date().toISOString();
    const link: ReportShareLink = {
      id: randomUUID(),
      workspaceId: reportExport.workspaceId,
      exportId: reportExport.id,
      token: `rpt_${randomBytes(16).toString("hex")}`,
      status: "active",
      expiresAt: input.expiresAt ?? reportExport.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
      createdBy: actor?.userId ?? demoUser.id,
      createdAt: now
    };
    this.shareLinks.unshift(link);
    this.auditService.record({
      workspaceId: link.workspaceId,
      userId: actor?.userId,
      action: "reports.share_link_created",
      entityType: "report_share_link",
      entityId: link.id,
      newValues: { exportId: link.exportId, expiresAt: link.expiresAt }
    });
    return link;
  }

  listShareLinks(workspaceId = demoWorkspace.id) {
    return this.shareLinks
      .filter((link) => link.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private buildPayload(workspaceId: string, type: ReportExport["type"]) {
    const analytics = demoAnalytics.filter((snapshot) => snapshot.workspaceId === workspaceId);
    const campaigns = demoCampaigns.filter((campaign) => campaign.workspaceId === workspaceId);
    const budget = demoCampaignBudgetLines.filter((line) => line.workspaceId === workspaceId);
    const listeningAlerts = demoListeningAlerts.filter((alert) => alert.workspaceId === workspaceId);
    return {
      type,
      generatedAt: new Date().toISOString(),
      analytics: {
        impressions: analytics.reduce((total, snapshot) => total + snapshot.metrics.impressions, 0),
        engagements: analytics.reduce((total, snapshot) => total + snapshot.metrics.engagements, 0),
        conversions: analytics.reduce((total, snapshot) => total + snapshot.metrics.conversions, 0)
      },
      campaigns: {
        total: campaigns.length,
        reports: demoCampaignReports.filter((report) => report.workspaceId === workspaceId).length,
        budgetAllocated: budget.reduce((total, line) => total + line.allocated, 0),
        budgetSpent: budget.reduce((total, line) => total + line.spent, 0)
      },
      listening: {
        monitors: demoListeningMonitors.filter((monitor) => monitor.workspaceId === workspaceId).length,
        openAlerts: listeningAlerts.filter((alert) => !alert.resolved).length
      },
      narrative: [
        "Campaign reporting combines analytics, budget pacing, and listening risk.",
        "Export is ready for white-labeled stakeholder sharing."
      ]
    };
  }

  private nextRunAt(frequency: ScheduledReport["frequency"]) {
    const date = new Date();
    const days = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;
    date.setDate(date.getDate() + days);
    date.setHours(9, 0, 0, 0);
    return date.toISOString();
  }

  private findTemplate(id: string) {
    const template = this.templates.find((item) => item.id === id);
    if (!template) {
      throw new NotFoundException("Report template not found");
    }
    return template;
  }

  private findExport(id: string) {
    const reportExport = this.exports.find((item) => item.id === id);
    if (!reportExport) {
      throw new NotFoundException("Report export not found");
    }
    return reportExport;
  }
}
