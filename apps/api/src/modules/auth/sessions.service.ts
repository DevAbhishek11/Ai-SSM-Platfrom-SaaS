import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
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
  idleExpiresAt: string;
  current: boolean;
};

/** Why a session cannot be used. `active` is the only usable state. */
export type SessionState = "active" | "unknown" | "revoked" | "expired" | "idle";

export type RotationFailure = {
  reason: "unknown" | "reuse_detected" | "expired" | "idle";
};

export type RotationOutcome = IssuedRefreshToken | RotationFailure;

export const isRotationFailure = (outcome: RotationOutcome): outcome is RotationFailure =>
  "reason" in outcome;

const REFRESH_TOKEN_PREFIX = "ssm_rt_";
const TOKEN_BYTES = 32;

/**
 * Refresh-token session store with rotation, reuse detection, idle expiry and a
 * concurrency bound.
 *
 * Tokens are opaque random strings; only their SHA-256 digest is retained, so a
 * dump of this store cannot be replayed against the API. Lookups compare digests
 * in constant time to keep the map from becoming a timing oracle.
 */
@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly sessions = new Map<string, RefreshSession>();
  /**
   * Replacements handed out very recently, keyed by the digest of the token
   * that was rotated.
   *
   * A browser routinely presents the same refresh token from several requests
   * at once -- two tabs waking after the access cookie expired, a prefetch
   * racing the navigation it belongs to. Treating the losers of that race as
   * token theft signs the user out for doing nothing wrong, so within the grace
   * window the same replacement is returned to all of them and the tabs
   * converge on one session. Outside the window a replay is still theft.
   */
  private readonly recentRotations = new Map<
    string,
    { outcome: IssuedRefreshToken; expiresAt: number }
  >();

  issue(input: {
    userId: string;
    workspaceId: string;
    role: Role;
    ipAddress?: string;
    userAgent?: string;
    familyId?: string;
  }): IssuedRefreshToken {
    this.pruneExpired();

    const token = `${REFRESH_TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString("base64url")}`;
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
      expiresAt: new Date(now.getTime() + this.absoluteTtlMs()).toISOString()
    };

    this.sessions.set(session.id, session);
    this.enforceConcurrencyLimit(input.userId, session.id);
    return { token, session };
  }

  /**
   * Consumes a refresh token and issues its replacement.
   *
   * Presenting an already-rotated token revokes the whole family, since that is
   * the signature of a stolen token being replayed. The caller gets a reason so
   * it can log precisely without leaking the distinction to the client.
   */
  rotate(
    token: string,
    context: { ipAddress?: string; userAgent?: string } = {}
  ): RotationOutcome {
    const tokenHash = this.hashToken(token);
    const replay = this.recentRotations.get(tokenHash);
    if (replay) {
      // Only honour the replay while the window is open *and* the replacement
      // is still usable: a logout or an admin revoke during the grace period
      // must not be undone by a straggling request.
      if (replay.expiresAt > Date.now() && this.validate(replay.outcome.session.id) === "active") {
        return replay.outcome;
      }
      this.recentRotations.delete(tokenHash);
    }

    const session = this.findByToken(token);

    if (!session) {
      return { reason: "unknown" };
    }

    if (session.revokedAt) {
      this.revokeFamily(session.familyId, "refresh_token_reuse_detected");
      this.logger.warn(
        `Refresh token reuse detected for user ${session.userId}; revoked session family ${session.familyId}`
      );
      return { reason: "reuse_detected" };
    }

    const state = this.stateOf(session);
    if (state !== "active") {
      this.revoke(session.id, state === "idle" ? "idle_timeout" : "expired");
      return { reason: state === "idle" ? "idle" : "expired" };
    }

    session.revokedAt = new Date().toISOString();
    session.revokedReason = "rotated";

    const issued = this.issue({
      userId: session.userId,
      workspaceId: session.workspaceId,
      role: session.role,
      ipAddress: context.ipAddress ?? session.ipAddress,
      userAgent: context.userAgent ?? session.userAgent,
      familyId: session.familyId
    });

    const graceMs = this.rotationGraceMs();
    if (graceMs > 0) {
      this.recentRotations.set(tokenHash, { outcome: issued, expiresAt: Date.now() + graceMs });
    }

    return issued;
  }

  /**
   * State of a session id carried by an access token.
   *
   * Access tokens are self-contained, so without this check a logout or an idle
   * timeout would not take effect until the token expired on its own.
   */
  validate(sessionId: string): SessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return "unknown";
    }
    if (session.revokedAt) {
      return "revoked";
    }
    return this.stateOf(session);
  }

  /**
   * Records activity against a session, sliding its idle window forward.
   * Returns false when the session is no longer usable.
   */
  touch(sessionId: string): boolean {
    const state = this.validate(sessionId);
    if (state !== "active") {
      if (state === "idle") {
        this.revoke(sessionId, "idle_timeout");
      }
      return false;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.lastUsedAt = new Date().toISOString();
    return true;
  }

  revokeByToken(token: string, reason = "logout"): RefreshSession | undefined {
    const session = this.findByToken(token);
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

  revokeAllForUser(userId: string, reason = "revoked_all", options: { except?: string } = {}): number {
    let revoked = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt && session.id !== options.except) {
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

    // Do not keep a usable credential for a family that has just been killed.
    for (const [hash, entry] of this.recentRotations) {
      if (entry.outcome.session.familyId === familyId) {
        this.recentRotations.delete(hash);
      }
    }
  }

  listForUser(userId: string, currentSessionId?: string): SessionSummary[] {
    this.pruneExpired();
    return [...this.sessions.values()]
      .filter((session) => session.userId === userId && this.stateOf(session) === "active" && !session.revokedAt)
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
        idleExpiresAt: new Date(Date.parse(session.lastUsedAt) + this.idleTimeoutMs()).toISOString(),
        current: session.id === currentSessionId
      }));
  }

  findById(sessionId: string): RefreshSession | undefined {
    return this.sessions.get(sessionId);
  }

  /** Test/ops hook: number of sessions currently held, live or tombstoned. */
  size(): number {
    return this.sessions.size;
  }

  private stateOf(session: RefreshSession): SessionState {
    if (Date.parse(session.expiresAt) <= Date.now()) {
      return "expired";
    }
    if (Date.parse(session.lastUsedAt) + this.idleTimeoutMs() <= Date.now()) {
      return "idle";
    }
    return "active";
  }

  /**
   * Constant-time digest comparison, so the store cannot be probed by measuring
   * how long a lookup for a near-miss token takes.
   */
  private findByToken(token: string): RefreshSession | undefined {
    if (typeof token !== "string" || !token.startsWith(REFRESH_TOKEN_PREFIX)) {
      return undefined;
    }

    const candidate = Buffer.from(this.hashToken(token), "hex");
    let match: RefreshSession | undefined;
    for (const session of this.sessions.values()) {
      const stored = Buffer.from(session.tokenHash, "hex");
      if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) {
        match = session;
      }
    }
    return match;
  }

  /** Keeps a user's live session count bounded, evicting the least recently used. */
  private enforceConcurrencyLimit(userId: string, keepSessionId: string): void {
    const limit = getEnv().SESSION_MAX_PER_USER;
    const live = [...this.sessions.values()]
      .filter((session) => session.userId === userId && !session.revokedAt && this.stateOf(session) === "active")
      .sort((a, b) => a.lastUsedAt.localeCompare(b.lastUsedAt));

    let excess = live.length - limit;
    for (const session of live) {
      if (excess <= 0) {
        break;
      }
      if (session.id === keepSessionId) {
        continue;
      }
      session.revokedAt = new Date().toISOString();
      session.revokedReason = "concurrent_session_limit";
      excess -= 1;
    }
  }

  private pruneExpired(): void {
    // Grace entries hold a live credential, so they are dropped the moment they
    // lapse rather than being left to age out with the sessions.
    const nowMs = Date.now();
    for (const [hash, entry] of this.recentRotations) {
      if (entry.expiresAt <= nowMs) {
        this.recentRotations.delete(hash);
      }
    }

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [id, session] of this.sessions) {
      const expired = Date.parse(session.expiresAt) < cutoff;
      const staleRevoked = session.revokedAt !== undefined && Date.parse(session.revokedAt) < cutoff;
      if (expired || staleRevoked) {
        this.sessions.delete(id);
      }
    }
  }

  private absoluteTtlMs(): number {
    return getEnv().REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  private rotationGraceMs(): number {
    return getEnv().REFRESH_ROTATION_GRACE_SECONDS * 1000;
  }

  private idleTimeoutMs(): number {
    return getEnv().SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
