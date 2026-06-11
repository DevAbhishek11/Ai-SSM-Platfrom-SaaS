import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { demoAuditLogs, demoWorkspace, type AuditLog } from "@ssm/domain";

export type AuditRecordInput = {
  workspaceId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export type AuditLogFilters = {
  action?: string;
  entityType?: string;
  userId?: string;
  limit?: number;
};

@Injectable()
export class AuditService {
  private readonly logs: AuditLog[] = demoAuditLogs.map((log) => ({
    ...log,
    oldValues: log.oldValues ? { ...log.oldValues } : undefined,
    newValues: log.newValues ? { ...log.newValues } : undefined
  }));

  listLogs(workspaceId = demoWorkspace.id, filters: AuditLogFilters = {}) {
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);
    return this.logs
      .filter((log) => !log.workspaceId || log.workspaceId === workspaceId)
      .filter((log) => !filters.action || log.action.startsWith(filters.action))
      .filter((log) => !filters.entityType || log.entityType === filters.entityType)
      .filter((log) => !filters.userId || log.userId === filters.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  summary(workspaceId = demoWorkspace.id) {
    const logs = this.listLogs(workspaceId, { limit: 500 });
    const byCategory = logs.reduce<Record<string, number>>((acc, log) => {
      const category = log.action.split(".")[0] ?? "other";
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});

    const riskSignals = logs.filter((log) =>
      ["failed", "expired", "revoked", "deleted", "missing"].some((signal) =>
        log.action.includes(signal)
      )
    );

    return {
      workspaceId,
      total: logs.length,
      byCategory,
      riskSignals: riskSignals.length,
      privilegedActions: logs.filter((log) =>
        ["billing", "workspace", "members", "social", "webhooks", "auth"].some((prefix) =>
          log.action.startsWith(prefix)
        )
      ).length,
      latest: logs.slice(0, 5)
    };
  }

  exportLogs(workspaceId = demoWorkspace.id) {
    const records = this.listLogs(workspaceId, { limit: 500 });
    return {
      workspaceId,
      generatedAt: new Date().toISOString(),
      format: "json",
      retention: "7 years",
      records
    };
  }

  record(input: AuditRecordInput): AuditLog {
    const log: AuditLog = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValues: input.oldValues,
      newValues: input.newValues,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      createdAt: new Date().toISOString()
    };
    this.logs.unshift(log);
    return log;
  }
}
