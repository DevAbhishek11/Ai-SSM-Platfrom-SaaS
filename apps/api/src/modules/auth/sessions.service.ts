import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import type { Role } from "@ssm/domain";
import { getEnv } from "../../common/env.js";

export type RefreshSession = {
  id: string;
  userId: string;
  workspaceId: string;
  role: Role;
  tokenHash: string;
  /** Every rotation keeps the same family id so token reuse is detectable. */
  familyId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedReason?: string;
};

export type IssuedRefreshToken = {
  token: string;
  session: RefreshSession;
};

export type SessionSummary = {
  id: string;
  workspaceId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
};

const REFRESH_TOKEN_PREFIX = "ssm_rt_";

/**
 * Refresh-token session store with rotation and reuse detection.
 *
 * Tokens are opaque random strings; only their SHA-256 digest is retained, so a
 * dump of this store cannot be replayed against the API.
 */
@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly sessions = new Map<string, RefreshSession>();

  issue(input: {
    userId: string;
    workspaceId: string;
    role: Role;
    ipAddress?: string;
    userAgent?: string;
    familyId?: string;
  }): IssuedRefreshToken {
    this.pruneExpired();

    const token = `${REFRESH_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
    const now = new Date();
    const session: RefreshSession = {
      id: randomUUID(),
      userId: input.userId,
      workspaceId: input.workspaceId,
      role: input.role,
      tokenHash: this.hashToken(token),
      familyId: input.familyId ?? randomUUID(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent?.slice(0, 300),
      createdAt: now.toISOString(),
      lastUsedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.ttlMs()).toISOString()
    };

    this.sessions.set(session.id, session);
    return { token, session };
  }

  /**
   * Consumes a refresh token and issues its replacement.
   *
   * Returns `undefined` for unknown, expired, or revoked tokens. Presenting an
   * already-rotated token revokes the whole family, since that is the signature
   * of a stolen token being replayed.
   */
  rotate(token: string, context: { ipAddress?: string; userAgent?: string } = {}): IssuedRefreshToken | undefined {
    const tokenHash = this.hashToken(token);
    const session = [...this.sessions.values()].find((entry) => entry.tokenHash === tokenHash);

    if (!session) {
      return undefined;
    }

    if (session.revokedAt) {
      this.revokeFamily(session.familyId, "refresh_token_reuse_detected");
      this.logger.warn(
        `Refresh token reuse detected for user ${session.userId}; revoked session family ${session.familyId}`
      );
      return undefined;
    }

    if (this.isExpired(session)) {
      this.revoke(session.id, "expired");
      return undefined;
    }

    session.revokedAt = new Date().toISOString();
    session.revokedReason = "rotated";

    return this.issue({
      userId: session.userId,
      workspaceId: session.workspaceId,
      role: session.role,
      ipAddress: context.ipAddress ?? session.ipAddress,
      userAgent: context.userAgent ?? session.userAgent,
      familyId: session.familyId
    });
  }

  revokeByToken(token: string, reason = "logout"): RefreshSession | undefined {
    const tokenHash = this.hashToken(token);
    const session = [...this.sessions.values()].find((entry) => entry.tokenHash === tokenHash);
    if (!session || session.revokedAt) {
      return undefined;
    }

    session.revokedAt = new Date().toISOString();
    session.revokedReason = reason;
    return session;
  }

  revoke(sessionId: string, reason = "revoked"): RefreshSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session || session.revokedAt) {
      return undefined;
    }

    session.revokedAt = new Date().toISOString();
    session.revokedReason = reason;
    return session;
  }

  revokeAllForUser(userId: string, reason = "revoked_all"): number {
    let revoked = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = new Date().toISOString();
        session.revokedReason = reason;
        revoked += 1;
      }
    }
    return revoked;
  }

  revokeFamily(familyId: string, reason: string): void {
    for (const session of this.sessions.values()) {
      if (session.familyId === familyId && !session.revokedAt) {
        session.revokedAt = new Date().toISOString();
        session.revokedReason = reason;
      }
    }
  }

  listForUser(userId: string, currentSessionId?: string): SessionSummary[] {
    this.pruneExpired();
    return [...this.sessions.values()]
      .filter((session) => session.userId === userId && !session.revokedAt && !this.isExpired(session))
      .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
      .map((session) => ({
        id: session.id,
        workspaceId: session.workspaceId,
        role: session.role,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        current: session.id === currentSessionId
      }));
  }

  findById(sessionId: string): RefreshSession | undefined {
    return this.sessions.get(sessionId);
  }

  private isExpired(session: RefreshSession): boolean {
    return Date.parse(session.expiresAt) <= Date.now();
  }

  private pruneExpired(): void {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [id, session] of this.sessions) {
      const expired = Date.parse(session.expiresAt) < cutoff;
      const staleRevoked = session.revokedAt !== undefined && Date.parse(session.revokedAt) < cutoff;
      if (expired || staleRevoked) {
        this.sessions.delete(id);
      }
    }
  }

  private ttlMs(): number {
    return getEnv().REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
