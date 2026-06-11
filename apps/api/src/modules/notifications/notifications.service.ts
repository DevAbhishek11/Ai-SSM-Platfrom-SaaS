import { randomUUID } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import {
  demoNotificationDeliveryAttempts,
  demoNotificationPreferences,
  demoNotifications,
  demoUser,
  demoWorkspace,
  notificationChannels,
  type Notification,
  type NotificationChannel,
  type NotificationDeliveryAttempt,
  type NotificationPreference
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import type { RouteNotificationDto, UpdateNotificationPreferencesDto } from "./dto.js";

@Injectable()
export class NotificationsService {
  private readonly notifications: Notification[] = [...demoNotifications];
  private readonly preferences: NotificationPreference[] = demoNotificationPreferences.map((preference) => ({
    ...preference,
    channelSettings: { ...preference.channelSettings },
    quietHours: preference.quietHours ? { ...preference.quietHours } : undefined,
    mutedTypes: [...preference.mutedTypes]
  }));
  private readonly deliveryAttempts: NotificationDeliveryAttempt[] = demoNotificationDeliveryAttempts.map(
    (attempt) => ({
      ...attempt,
      metadata: { ...attempt.metadata }
    })
  );

  constructor(private readonly auditService: AuditService) {}

  list(userId: string) {
    return this.notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  markRead(id: string) {
    const notification = this.notifications.find((item) => item.id === id);
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    notification.read = true;
    return notification;
  }

  getPreferences(userId: string, workspaceId = demoWorkspace.id) {
    return this.findOrCreatePreferences(userId, workspaceId);
  }

  updatePreferences(
    userId: string,
    workspaceId: string,
    input: UpdateNotificationPreferencesDto,
    actor?: Principal
  ) {
    const preferences = this.findOrCreatePreferences(userId, workspaceId);
    const previous = {
      channelSettings: { ...preferences.channelSettings },
      digestFrequency: preferences.digestFrequency,
      quietHours: preferences.quietHours ? { ...preferences.quietHours } : undefined,
      mutedTypes: [...preferences.mutedTypes]
    };

    if (input.channelSettings) {
      preferences.channelSettings = { ...preferences.channelSettings, ...input.channelSettings };
    }
    if (input.digestFrequency) {
      preferences.digestFrequency = input.digestFrequency;
    }
    if (input.quietHours) {
      preferences.quietHours = input.quietHours;
    }
    if (input.mutedTypes) {
      preferences.mutedTypes = [...new Set(input.mutedTypes)];
    }
    preferences.updatedAt = new Date().toISOString();

    this.auditService.record({
      workspaceId,
      userId: actor?.userId,
      action: "notifications.preferences_updated",
      entityType: "notification_preference",
      entityId: preferences.id,
      oldValues: previous,
      newValues: {
        channelSettings: preferences.channelSettings,
        digestFrequency: preferences.digestFrequency,
        quietHours: preferences.quietHours,
        mutedTypes: preferences.mutedTypes
      }
    });

    return preferences;
  }

  listDeliveryAttempts(workspaceId: string, userId?: string) {
    return this.deliveryAttempts
      .filter((attempt) => attempt.workspaceId === workspaceId)
      .filter((attempt) => !userId || attempt.userId === userId)
      .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt));
  }

  route(input: RouteNotificationDto, actor?: Principal) {
    const now = new Date().toISOString();
    const notification: Notification = {
      id: randomUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadata: input.metadata ?? {},
      read: false,
      createdAt: now
    };
    this.notifications.unshift(notification);

    const preferences = this.findOrCreatePreferences(input.userId, input.workspaceId);
    const channels = this.enabledChannels(preferences);
    const muted = preferences.digestFrequency === "muted" || preferences.mutedTypes.includes(input.type);
    const quietHoursActive =
      input.metadata?.forceQuietHours === true || this.isQuietHoursActive(preferences.quietHours);
    const attempts = channels.map((channel) =>
      this.createDeliveryAttempt({
        notification,
        workspaceId: input.workspaceId,
        channel,
        priority: input.priority ?? "normal",
        muted,
        quietHoursActive
      })
    );

    this.auditService.record({
      workspaceId: input.workspaceId,
      userId: actor?.userId,
      action: "notifications.routed",
      entityType: "notification",
      entityId: notification.id,
      newValues: {
        type: notification.type,
        channels,
        delivered: attempts.filter((attempt) => attempt.status === "sent").length,
        suppressed: attempts.filter((attempt) => attempt.status === "suppressed").length
      }
    });

    return {
      notification,
      attempts
    };
  }

  private findOrCreatePreferences(userId: string, workspaceId: string): NotificationPreference {
    const existing = this.preferences.find(
      (preference) => preference.userId === userId && preference.workspaceId === workspaceId
    );
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const preferences: NotificationPreference = {
      id: randomUUID(),
      userId,
      workspaceId,
      channelSettings: {
        in_app: true,
        email: true,
        push: false,
        slack: false,
        teams: false,
        sms: false,
        webhook: false
      },
      digestFrequency: "instant",
      mutedTypes: [],
      createdAt: now,
      updatedAt: now
    };
    this.preferences.unshift(preferences);
    return preferences;
  }

  private enabledChannels(preferences: NotificationPreference): NotificationChannel[] {
    const channels = notificationChannels.filter((channel) => preferences.channelSettings[channel]);
    return channels.length ? channels : ["in_app"];
  }

  private createDeliveryAttempt({
    notification,
    workspaceId,
    channel,
    priority,
    muted,
    quietHoursActive
  }: {
    notification: Notification;
    workspaceId: string;
    channel: NotificationChannel;
    priority: "low" | "normal" | "high" | "critical";
    muted: boolean;
    quietHoursActive: boolean;
  }): NotificationDeliveryAttempt {
    const now = new Date().toISOString();
    const suppressForQuietHours = quietHoursActive && priority !== "critical" && channel !== "in_app";
    const status = muted || suppressForQuietHours ? "suppressed" : "sent";
    const attempt: NotificationDeliveryAttempt = {
      id: randomUUID(),
      notificationId: notification.id,
      workspaceId,
      userId: notification.userId,
      channel,
      status,
      provider: this.providerFor(channel),
      destination: this.destinationFor(channel, notification.userId),
      errorMessage: status === "suppressed" ? (muted ? "Suppressed by user preference." : "Suppressed by quiet hours.") : undefined,
      metadata: { priority, notificationType: notification.type },
      attemptedAt: now,
      deliveredAt: status === "sent" ? now : undefined
    };
    this.deliveryAttempts.unshift(attempt);
    return attempt;
  }

  private providerFor(channel: NotificationChannel) {
    const providers: Record<NotificationChannel, string> = {
      in_app: "ssm-in-app",
      email: "resend-demo",
      push: "web-push-demo",
      slack: "slack-demo",
      teams: "teams-demo",
      sms: "twilio-demo",
      webhook: "workspace-webhook"
    };
    return providers[channel];
  }

  private destinationFor(channel: NotificationChannel, userId: string) {
    if (channel === "email") {
      return userId === demoUser.id ? demoUser.email : `${userId}@example.local`;
    }
    if (channel === "slack") {
      return "#social-ops";
    }
    if (channel === "teams") {
      return "Social Ops";
    }
    if (channel === "sms") {
      return "+15555550100";
    }
    if (channel === "webhook") {
      return "https://hooks.example.com/acme/notifications";
    }
    return userId;
  }

  private isQuietHoursActive(quietHours: NotificationPreference["quietHours"]) {
    if (!quietHours?.enabled) {
      return false;
    }

    const [startHour, startMinute] = quietHours.start.split(":").map(Number);
    const [endHour, endMinute] = quietHours.end.split(":").map(Number);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = (startHour ?? 0) * 60 + (startMinute ?? 0);
    const endMinutes = (endHour ?? 0) * 60 + (endMinute ?? 0);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}
