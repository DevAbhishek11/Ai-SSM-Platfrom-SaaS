import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoAuthSessions,
  demoSsoConnections,
  demoTrustedDevices,
  demoUser,
  demoWorkspace,
  type AuthSession,
  type SsoConnection,
  type TrustedDevice
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import type { CreateSsoConnectionDto, TrustDeviceDto } from "./dto.js";

@Injectable()
export class IdentityService {
  private readonly ssoConnections: SsoConnection[] = demoSsoConnections.map((connection) => ({
    ...connection,
    metadata: { ...connection.metadata }
  }));
  private readonly trustedDevices: TrustedDevice[] = demoTrustedDevices.map((device) => ({
    ...device
  }));
  private readonly sessions: AuthSession[] = demoAuthSessions.map((session) => ({
    ...session
  }));

  constructor(private readonly auditService: AuditService) {}

  listSsoConnections(workspaceId = demoWorkspace.id) {
    return this.ssoConnections
      .filter((connection) => connection.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createSsoConnection(input: CreateSsoConnectionDto, actor?: Principal) {
    const now = new Date().toISOString();
    const existing = this.ssoConnections.find(
      (connection) =>
        connection.workspaceId === input.workspaceId &&
        connection.domain.toLowerCase() === input.domain.trim().toLowerCase() &&
        connection.status !== "disabled"
    );
    if (existing) {
      throw new BadRequestException("An enabled SSO connection already exists for this domain");
    }

    const connection: SsoConnection = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      providerType: input.providerType,
      status: "draft",
      domain: input.domain.trim().toLowerCase(),
      entityId: input.entityId.trim(),
      ssoUrl: input.ssoUrl.trim(),
      certificateFingerprint: input.certificateFingerprint.trim(),
      metadata: input.metadata ?? {},
      createdBy: actor?.userId ?? demoUser.id,
      createdAt: now,
      updatedAt: now
    };

    this.ssoConnections.unshift(connection);
    this.auditService.record({
      workspaceId: connection.workspaceId,
      userId: actor?.userId,
      action: "identity.sso_connection_created",
      entityType: "sso_connection",
      entityId: connection.id,
      newValues: {
        providerType: connection.providerType,
        domain: connection.domain,
        status: connection.status
      }
    });
    return connection;
  }

  testSsoConnection(id: string, actor?: Principal) {
    const connection = this.findSsoConnection(id);
    const previousStatus = connection.status;
    const now = new Date().toISOString();
    connection.status = "active";
    connection.lastTestedAt = now;
    connection.updatedAt = now;

    this.auditService.record({
      workspaceId: connection.workspaceId,
      userId: actor?.userId,
      action: "identity.sso_connection_tested",
      entityType: "sso_connection",
      entityId: connection.id,
      oldValues: { status: previousStatus },
      newValues: { status: connection.status, lastTestedAt: connection.lastTestedAt }
    });
    return connection;
  }

  disableSsoConnection(id: string, actor?: Principal) {
    const connection = this.findSsoConnection(id);
    if (connection.status === "disabled") {
      throw new BadRequestException("SSO connection is already disabled");
    }

    const previousStatus = connection.status;
    connection.status = "disabled";
    connection.updatedAt = new Date().toISOString();

    this.auditService.record({
      workspaceId: connection.workspaceId,
      userId: actor?.userId,
      action: "identity.sso_connection_disabled",
      entityType: "sso_connection",
      entityId: connection.id,
      oldValues: { status: previousStatus },
      newValues: { status: connection.status }
    });
    return connection;
  }

  listSessions(workspaceId = demoWorkspace.id, userId?: string) {
    return this.sessions
      .filter((session) => session.workspaceId === workspaceId)
      .filter((session) => !userId || session.userId === userId)
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  revokeSession(id: string, actor?: Principal) {
    const session = this.findSession(id);
    if (session.status === "revoked") {
      throw new BadRequestException("Session is already revoked");
    }

    const previousStatus = session.status;
    const now = new Date().toISOString();
    session.status = "revoked";
    session.revokedAt = now;

    this.auditService.record({
      workspaceId: session.workspaceId,
      userId: actor?.userId,
      action: "identity.session_revoked",
      entityType: "auth_session",
      entityId: session.id,
      oldValues: { status: previousStatus },
      newValues: { status: session.status, revokedAt: session.revokedAt }
    });
    return session;
  }

  listTrustedDevices(workspaceId = demoWorkspace.id, userId?: string) {
    return this.trustedDevices
      .filter((device) => device.workspaceId === workspaceId)
      .filter((device) => !userId || device.userId === userId)
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  trustDevice(id: string, input: TrustDeviceDto = {}, actor?: Principal) {
    const device = this.findDevice(id);
    const previous = { name: device.name, status: device.status };
    if (input.name) {
      device.name = input.name.trim();
    }
    device.status = "trusted";
    device.revokedAt = undefined;
    device.lastSeenAt = new Date().toISOString();

    this.auditService.record({
      workspaceId: device.workspaceId,
      userId: actor?.userId,
      action: "identity.device_trusted",
      entityType: "trusted_device",
      entityId: device.id,
      oldValues: previous,
      newValues: { name: device.name, status: device.status }
    });
    return device;
  }

  revokeDevice(id: string, actor?: Principal) {
    const device = this.findDevice(id);
    if (device.status === "revoked") {
      throw new BadRequestException("Device is already revoked");
    }

    const previousStatus = device.status;
    const now = new Date().toISOString();
    device.status = "revoked";
    device.revokedAt = now;

    const revokedSessions = this.sessions.filter(
      (session) => session.deviceId === device.id && session.status === "active"
    );
    for (const session of revokedSessions) {
      session.status = "revoked";
      session.revokedAt = now;
    }

    this.auditService.record({
      workspaceId: device.workspaceId,
      userId: actor?.userId,
      action: "identity.device_revoked",
      entityType: "trusted_device",
      entityId: device.id,
      oldValues: { status: previousStatus },
      newValues: {
        status: device.status,
        revokedAt: device.revokedAt,
        revokedSessionIds: revokedSessions.map((session) => session.id)
      }
    });
    return device;
  }

  private findSsoConnection(id: string): SsoConnection {
    const connection = this.ssoConnections.find((item) => item.id === id);
    if (!connection) {
      throw new NotFoundException("SSO connection not found");
    }
    return connection;
  }

  private findSession(id: string): AuthSession {
    const session = this.sessions.find((item) => item.id === id);
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    return session;
  }

  private findDevice(id: string): TrustedDevice {
    const device = this.trustedDevices.find((item) => item.id === id);
    if (!device) {
      throw new NotFoundException("Trusted device not found");
    }
    return device;
  }
}
