import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoListeningAlerts,
  demoListeningMonitors,
  demoSocialMentions,
  demoUser,
  demoWorkspace,
  type ListeningAlert,
  type ListeningAlertSeverity,
  type ListeningMonitor,
  type ListeningMonitorStatus,
  type SentimentLabel,
  type SocialMention
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { CreateListeningMonitorDto, IngestSocialMentionDto } from "./dto.js";

@Injectable()
export class ListeningService {
  private readonly monitors: ListeningMonitor[] = demoListeningMonitors.map((monitor) => ({
    ...monitor,
    platforms: [...monitor.platforms]
  }));

  private readonly mentions: SocialMention[] = demoSocialMentions.map((mention) => ({
    ...mention,
    metadata: { ...mention.metadata }
  }));

  private readonly alerts: ListeningAlert[] = demoListeningAlerts.map((alert) => ({ ...alert }));

  constructor(
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  summary(workspaceId = demoWorkspace.id) {
    const monitors = this.listMonitors(workspaceId);
    const mentions = this.listMentions(workspaceId);
    const alerts = this.listAlerts(workspaceId);
    const sentimentBreakdown = this.sentimentBreakdown(mentions);
    const openAlerts = alerts.filter((alert) => !alert.resolved);

    return {
      workspaceId,
      activeMonitors: monitors.filter((monitor) => monitor.status === "active").length,
      totalMonitors: monitors.length,
      totalMentions: mentions.length,
      negativeMentions: sentimentBreakdown.negative,
      totalReach: mentions.reduce((total, mention) => total + mention.reach, 0),
      totalEngagement: mentions.reduce((total, mention) => total + mention.engagement, 0),
      openAlerts: openAlerts.length,
      criticalAlerts: openAlerts.filter((alert) => alert.severity === "critical").length,
      sentimentBreakdown,
      latestMentions: mentions.slice(0, 5),
      activeAlerts: openAlerts.slice(0, 5)
    };
  }

  listMonitors(workspaceId = demoWorkspace.id, status?: ListeningMonitorStatus) {
    return this.monitors
      .filter((monitor) => monitor.workspaceId === workspaceId)
      .filter((monitor) => !status || monitor.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createMonitor(input: CreateListeningMonitorDto, actor?: Principal) {
    const now = new Date().toISOString();
    const monitor: ListeningMonitor = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      type: input.type,
      query: input.query.trim(),
      platforms: [...new Set(input.platforms ?? [])],
      status: "active",
      alertThreshold: input.alertThreshold ?? 75,
      createdBy: actor?.userId ?? demoUser.id,
      createdAt: now,
      updatedAt: now
    };

    this.monitors.unshift(monitor);
    this.auditService.record({
      workspaceId: monitor.workspaceId,
      userId: actor?.userId,
      action: "listening.monitor_created",
      entityType: "listening_monitor",
      entityId: monitor.id,
      newValues: {
        type: monitor.type,
        query: monitor.query,
        platforms: monitor.platforms,
        alertThreshold: monitor.alertThreshold
      }
    });

    return monitor;
  }

  setMonitorStatus(id: string, status: ListeningMonitorStatus, actor?: Principal) {
    const monitor = this.findMonitor(id);
    const oldStatus = monitor.status;
    monitor.status = status;
    monitor.updatedAt = new Date().toISOString();

    this.auditService.record({
      workspaceId: monitor.workspaceId,
      userId: actor?.userId,
      action: "listening.monitor_status_updated",
      entityType: "listening_monitor",
      entityId: monitor.id,
      oldValues: { status: oldStatus },
      newValues: { status }
    });

    return monitor;
  }

  listMentions(workspaceId = demoWorkspace.id, monitorId?: string) {
    return this.mentions
      .filter((mention) => mention.workspaceId === workspaceId)
      .filter((mention) => !monitorId || mention.monitorId === monitorId)
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  ingestMention(input: IngestSocialMentionDto, actor?: Principal) {
    const monitor = this.findMonitor(input.monitorId);
    if (monitor.workspaceId !== input.workspaceId) {
      throw new BadRequestException("Monitor does not belong to the requested workspace");
    }
    if (monitor.status !== "active") {
      throw new BadRequestException(`Monitor is ${monitor.status}`);
    }

    const now = new Date().toISOString();
    const mention: SocialMention = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      monitorId: monitor.id,
      platform: input.platform,
      author: input.author.trim(),
      content: input.content.trim(),
      url: input.url,
      sentiment: input.sentiment,
      reach: input.reach,
      engagement: input.engagement,
      detectedAt: now,
      metadata: input.metadata ? { ...input.metadata } : {}
    };

    this.mentions.unshift(mention);
    const alert = this.createAlertForMention(monitor, mention, actor);

    this.auditService.record({
      workspaceId: mention.workspaceId,
      userId: actor?.userId,
      action: "listening.mention_ingested",
      entityType: "social_mention",
      entityId: mention.id,
      newValues: {
        monitorId: mention.monitorId,
        platform: mention.platform,
        sentiment: mention.sentiment,
        reach: mention.reach,
        alertId: alert?.id
      }
    });

    return {
      mention,
      alert
    };
  }

  listAlerts(workspaceId = demoWorkspace.id, resolved?: boolean) {
    return this.alerts
      .filter((alert) => alert.workspaceId === workspaceId)
      .filter((alert) => resolved === undefined || alert.resolved === resolved)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  resolveAlert(id: string, actor?: Principal) {
    const alert = this.findAlert(id);
    if (alert.resolved) {
      return alert;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    this.auditService.record({
      workspaceId: alert.workspaceId,
      userId: actor?.userId,
      action: "listening.alert_resolved",
      entityType: "listening_alert",
      entityId: alert.id,
      oldValues: { resolved: false },
      newValues: { resolved: true, resolvedAt: alert.resolvedAt }
    });

    return alert;
  }

  private createAlertForMention(
    monitor: ListeningMonitor,
    mention: SocialMention,
    actor?: Principal
  ) {
    const severity = this.assessSeverity(monitor, mention);
    if (!severity) {
      return undefined;
    }

    const now = new Date().toISOString();
    const alert: ListeningAlert = {
      id: randomUUID(),
      workspaceId: mention.workspaceId,
      monitorId: monitor.id,
      mentionId: mention.id,
      severity,
      title: this.alertTitle(severity, mention),
      body: this.alertBody(monitor, mention),
      resolved: false,
      createdAt: now
    };

    this.alerts.unshift(alert);
    this.auditService.record({
      workspaceId: alert.workspaceId,
      userId: actor?.userId,
      action: "listening.alert_created",
      entityType: "listening_alert",
      entityId: alert.id,
      newValues: {
        monitorId: monitor.id,
        mentionId: mention.id,
        severity: alert.severity,
        reach: mention.reach,
        sentiment: mention.sentiment
      }
    });

    if (severity !== "info") {
      this.notificationsService.route(
        {
          workspaceId: alert.workspaceId,
          userId: actor?.userId ?? demoUser.id,
          type: "mention",
          title: alert.title,
          body: alert.body,
          priority: severity === "critical" ? "critical" : "high",
          metadata: {
            alertId: alert.id,
            monitorId: monitor.id,
            mentionId: mention.id,
            severity,
            platform: mention.platform,
            reach: mention.reach
          }
        },
        actor
      );
    }

    return alert;
  }

  private assessSeverity(
    monitor: ListeningMonitor,
    mention: SocialMention
  ): ListeningAlertSeverity | undefined {
    const highReach = mention.reach >= monitor.alertThreshold * 1000;
    const highEngagement = mention.engagement >= Math.max(250, monitor.alertThreshold * 10);

    if (mention.sentiment === "negative" && highReach) {
      return "critical";
    }
    if (mention.sentiment === "negative" || (mention.sentiment === "mixed" && highReach)) {
      return "warning";
    }
    if (highReach || highEngagement) {
      return "info";
    }
    return undefined;
  }

  private sentimentBreakdown(mentions: SocialMention[]): Record<SentimentLabel, number> {
    return mentions.reduce<Record<SentimentLabel, number>>(
      (acc, mention) => {
        acc[mention.sentiment] += 1;
        return acc;
      },
      { negative: 0, neutral: 0, positive: 0, mixed: 0 }
    );
  }

  private alertTitle(severity: ListeningAlertSeverity, mention: SocialMention) {
    if (severity === "critical") {
      return `Critical ${this.platformLabel(mention.platform)} mention is gaining reach`;
    }
    if (severity === "warning") {
      return `${this.platformLabel(mention.platform)} mention needs review`;
    }
    return `${this.platformLabel(mention.platform)} mention is trending`;
  }

  private alertBody(monitor: ListeningMonitor, mention: SocialMention) {
    const snippet =
      mention.content.length > 160 ? `${mention.content.slice(0, 157)}...` : mention.content;
    return `${monitor.query} matched a ${mention.sentiment} mention from ${mention.author} with ${mention.reach.toLocaleString()} reach: ${snippet}`;
  }

  private platformLabel(platform: SocialMention["platform"]) {
    if (platform === "x") {
      return "X";
    }
    return platform[0].toUpperCase() + platform.slice(1);
  }

  private findMonitor(id: string) {
    const monitor = this.monitors.find((item) => item.id === id);
    if (!monitor) {
      throw new NotFoundException("Listening monitor not found");
    }
    return monitor;
  }

  private findAlert(id: string) {
    const alert = this.alerts.find((item) => item.id === id);
    if (!alert) {
      throw new NotFoundException("Listening alert not found");
    }
    return alert;
  }
}
