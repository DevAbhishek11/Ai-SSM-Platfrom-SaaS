import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { jwtVerify, SignJWT } from "jose";
import type { Role } from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { getEnv } from "../../common/env.js";
import { AuditService } from "../audit/audit.service.js";
import { AccountsService, type Account, type Membership } from "./accounts.service.js";
import { LoginAttemptsService } from "./login-attempts.service.js";
import { isRotationFailure, SessionsService, type SessionState } from "./sessions.service.js";

/**
 * Machine-readable reasons attached to 401s so the web tier can tell "your
 * session ended" apart from "those credentials are wrong" without parsing prose.
 */
export const AUTH_ERROR_CODES = {
  invalidCredentials: "invalid_credentials",
  accountLocked: "account_locked",
  sessionExpired: "session_expired",
  sessionRevoked: "session_revoked",
  sessionIdle: "session_idle",
  invalidToken: "invalid_token",
  registrationDisabled: "registration_disabled"
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/** 401 carrying a stable `code` alongside the human-readable message. */
export class AuthFailureException extends UnauthorizedException {
  constructor(message: string, readonly code: AuthErrorCode) {
    super({ message, code, error: "Unauthorized", statusCode: 401 });
  }
}

export type AuthEventContext = {
  ipAddress?: string;
  userAgent?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshExpiresAt: string;
  sessionId: string;
};

export type AuthResult = AuthTokens & {
  user: ReturnType<AccountsService["present"]>;
  workspace: Membership;
  role: Role;
  permissions: Principal["permissions"];
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly accountsService: AccountsService,
    private readonly sessionsService: SessionsService,
    private readonly loginAttemptsService: LoginAttemptsService,
    private readonly auditService: AuditService
  ) {}

  async register(
    input: { email: string; password: string; name: string; workspaceName?: string; timezone?: string },
    context: AuthEventContext = {}
  ): Promise<AuthResult> {
    if (!getEnv().AUTH_REGISTRATION_ENABLED) {
      throw new ForbiddenException({
        message: "Self-service registration is disabled for this deployment",
        code: AUTH_ERROR_CODES.registrationDisabled,
        statusCode: 403,
        error: "Forbidden"
      });
    }

    const account = await this.accountsService.register(input);
    const membership = this.accountsService.membershipFor(account);

    this.auditService.record({
      workspaceId: membership.workspaceId,
      userId: account.id,
      action: "auth.account_registered",
      entityType: "user",
      entityId: account.id,
      newValues: { email: account.email, workspaceId: membership.workspaceId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return this.completeSignIn(account, membership, context);
  }

  async login(
    email: string,
    password: string,
    context: AuthEventContext = {},
    workspaceId?: string
  ): Promise<AuthResult> {
    // Lockout is evaluated before any account lookup so a locked identity costs
    // an attacker a request without costing us an Argon2 verification.
    const lockout = this.loginAttemptsService.status(email);
    if (lockout.locked) {
      this.recordFailedLogin(email, "account_locked", context);
      throw new HttpException(
        {
          message: `Too many failed sign-in attempts. Try again in ${Math.ceil(
            lockout.retryAfterSeconds / 60
          )} minute(s).`,
          code: AUTH_ERROR_CODES.accountLocked,
          retryAfterSeconds: lockout.retryAfterSeconds,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests"
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const account = await this.accountsService.findByEmail(email);

    if (!account) {
      // Spend the same Argon2 budget as a real verification so response time
      // does not disclose whether the address exists.
      await this.accountsService.burnTiming(password);
      this.failLogin(email, "unknown_email", context);
    }

    if (account.status !== "active") {
      this.failLogin(email, `account_${account.status}`, context, account.id);
    }

    if (!(await this.accountsService.verifyPassword(account, password))) {
      this.failLogin(email, "bad_password", context, account.id);
    }

    const membership = this.accountsService.membershipFor(account, workspaceId);
    this.accountsService.markLogin(account);
    this.loginAttemptsService.recordSuccess(email);

    this.auditService.record({
      workspaceId: membership.workspaceId,
      userId: account.id,
      action: "auth.login_succeeded",
      entityType: "session",
      newValues: { role: membership.role, email: account.email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return this.completeSignIn(account, membership, context);
  }

  async refresh(refreshToken: string, context: AuthEventContext = {}): Promise<AuthResult> {
    if (typeof refreshToken !== "string" || refreshToken.length === 0) {
      throw new AuthFailureException("Refresh token is required", AUTH_ERROR_CODES.invalidToken);
    }

    const rotated = this.sessionsService.rotate(refreshToken, context);
    if (isRotationFailure(rotated)) {
      // The client always sees the same message; only the audit trail records why.
      this.auditService.record({
        workspaceId: "00000000-0000-4000-8000-000000000000",
        action: "auth.refresh_rejected",
        entityType: "session",
        newValues: { reason: rotated.reason },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
      throw new AuthFailureException(
        "Invalid or expired refresh token",
        rotated.reason === "idle" ? AUTH_ERROR_CODES.sessionIdle : AUTH_ERROR_CODES.sessionExpired
      );
    }

    const account = await this.accountsService.findById(rotated.session.userId);
    if (!account || account.status !== "active") {
      this.sessionsService.revoke(rotated.session.id, "account_unavailable");
      throw new AuthFailureException(
        "Invalid or expired refresh token",
        AUTH_ERROR_CODES.sessionRevoked
      );
    }

    const membership = this.accountsService.membershipFor(account, rotated.session.workspaceId);
    const accessToken = await this.signAccessToken(account, membership, rotated.session.id);

    return this.buildResult(account, membership, accessToken, rotated);
  }

  async logout(refreshToken: string | undefined, principal?: Principal, context: AuthEventContext = {}) {
    const revoked = refreshToken ? this.sessionsService.revokeByToken(refreshToken) : undefined;

    if (principal) {
      this.auditService.record({
        workspaceId: principal.workspaceId,
        userId: principal.userId,
        action: "auth.logout",
        entityType: "session",
        entityId: revoked?.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
    }

    return { revoked: revoked !== undefined };
  }

  async me(principal: Principal) {
    const account = await this.accountsService.findById(principal.userId);
    if (!account) {
      throw new AuthFailureException("Account not found", AUTH_ERROR_CODES.invalidToken);
    }

    const membership = this.accountsService.membershipFor(account, principal.workspaceId);

    return {
      user: this.accountsService.present(account),
      workspace: membership,
      role: membership.role,
      permissions: this.accountsService.permissionsFor(membership.role),
      sessionId: principal.sessionId
    };
  }

  async switchWorkspace(
    principal: Principal,
    workspaceId: string,
    context: AuthEventContext = {}
  ): Promise<AuthResult> {
    const account = await this.accountsService.findById(principal.userId);
    if (!account) {
      throw new AuthFailureException("Account not found", AUTH_ERROR_CODES.invalidToken);
    }

    const membership = this.accountsService.membershipFor(account, workspaceId);
    return this.completeSignIn(account, membership, context);
  }

  async changePassword(
    principal: Principal,
    currentPassword: string,
    newPassword: string,
    context: AuthEventContext = {}
  ) {
    const account = await this.accountsService.changePassword(
      principal.userId,
      currentPassword,
      newPassword
    );

    // Rotating credentials must invalidate every outstanding session.
    const revoked = this.sessionsService.revokeAllForUser(account.id, "password_changed");

    this.auditService.record({
      workspaceId: principal.workspaceId,
      userId: account.id,
      action: "auth.password_changed",
      entityType: "user",
      entityId: account.id,
      newValues: { revokedSessions: revoked },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return { status: "updated", revokedSessions: revoked };
  }

  async updateProfile(
    principal: Principal,
    patch: { name?: string; timezone?: string; language?: string },
    context: AuthEventContext = {}
  ) {
    const account = await this.accountsService.updateProfile(principal.userId, patch);

    this.auditService.record({
      workspaceId: principal.workspaceId,
      userId: account.id,
      action: "auth.profile_updated",
      entityType: "user",
      entityId: account.id,
      newValues: { ...patch },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return this.accountsService.present(account);
  }

  listSessions(principal: Principal) {
    return this.sessionsService.listForUser(principal.userId, principal.sessionId);
  }

  revokeSession(principal: Principal, sessionId: string) {
    const session = this.sessionsService.findById(sessionId);
    // Not found and not-yours are deliberately indistinguishable, otherwise this
    // endpoint enumerates session ids belonging to other users.
    if (!session || session.userId !== principal.userId) {
      throw new NotFoundException("Session not found");
    }

    this.sessionsService.revoke(sessionId, "revoked_by_user");
    this.auditService.record({
      workspaceId: principal.workspaceId,
      userId: principal.userId,
      action: "auth.session_revoked",
      entityType: "session",
      entityId: sessionId
    });

    return { status: "revoked", sessionId };
  }

  async verifyAccessToken(token: string): Promise<Principal> {
    const env = getEnv();
    let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];

    try {
      const verified = await jwtVerify(token, this.accessSecret(), {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE
      });
      payload = verified.payload;
    } catch {
      throw new AuthFailureException(
        "Invalid or expired access token",
        AUTH_ERROR_CODES.invalidToken
      );
    }

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.workspaceId !== "string"
    ) {
      throw new AuthFailureException("Invalid token payload", AUTH_ERROR_CODES.invalidToken);
    }

    const role = payload.role as Role;
    const permissions = this.accountsService.permissionsFor(role);
    if (permissions.length === 0 && role !== "viewer") {
      throw new AuthFailureException("Invalid token role", AUTH_ERROR_CODES.invalidToken);
    }

    // Access tokens are self-contained, so the session behind them has to be
    // re-checked on every request: without this, logout, an admin revoke, or an
    // idle timeout would not bite until the token expired on its own. Touching
    // the session also slides its inactivity window forward.
    const sessionId = typeof payload.sid === "string" ? payload.sid : undefined;
    if (sessionId) {
      const state = this.sessionsService.validate(sessionId);
      if (state !== "active") {
        this.sessionsService.touch(sessionId);
        throw new AuthFailureException(
          this.sessionStateMessage(state),
          this.sessionStateCode(state)
        );
      }
      this.sessionsService.touch(sessionId);
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role,
      workspaceId: payload.workspaceId,
      permissions,
      sessionId
    };
  }

  extractBearerToken(authorization: string | undefined): string | undefined {
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(" ");
    return type?.toLowerCase() === "bearer" && token ? token : undefined;
  }

  private async completeSignIn(
    account: Account,
    membership: Membership,
    context: AuthEventContext
  ): Promise<AuthResult> {
    const issued = this.sessionsService.issue({
      userId: account.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    const accessToken = await this.signAccessToken(account, membership, issued.session.id);
    return this.buildResult(account, membership, accessToken, issued);
  }

  private buildResult(
    account: Account,
    membership: Membership,
    accessToken: string,
    issued: { token: string; session: { id: string; expiresAt: string } }
  ): AuthResult {
    return {
      accessToken,
      refreshToken: issued.token,
      tokenType: "Bearer",
      expiresIn: getEnv().ACCESS_TOKEN_TTL_SECONDS,
      refreshExpiresAt: issued.session.expiresAt,
      sessionId: issued.session.id,
      user: this.accountsService.present(account),
      workspace: membership,
      role: membership.role,
      permissions: this.accountsService.permissionsFor(membership.role)
    };
  }

  /**
   * Records the failure, increments the lockout counter, and throws the single
   * generic 401 every failed sign-in produces. Declared `never` so callers can
   * treat the account as non-null afterwards.
   */
  private failLogin(
    email: string,
    reason: string,
    context: AuthEventContext,
    userId?: string
  ): never {
    const state = this.loginAttemptsService.recordFailure(email);
    this.recordFailedLogin(email, reason, context, userId);

    if (state.locked) {
      this.logger.warn(`Account locked after ${state.failedAttempts} failed sign-in attempts`);
    }

    throw new AuthFailureException(
      "Invalid email or password",
      AUTH_ERROR_CODES.invalidCredentials
    );
  }

  private sessionStateMessage(state: SessionState): string {
    switch (state) {
      case "revoked":
        return "Session has been revoked";
      case "idle":
        return "Session expired after a period of inactivity";
      case "expired":
        return "Session has expired";
      default:
        return "Session is no longer valid";
    }
  }

  private sessionStateCode(state: SessionState): AuthErrorCode {
    switch (state) {
      case "revoked":
        return AUTH_ERROR_CODES.sessionRevoked;
      case "idle":
        return AUTH_ERROR_CODES.sessionIdle;
      default:
        return AUTH_ERROR_CODES.sessionExpired;
    }
  }

  private recordFailedLogin(
    email: string,
    reason: string,
    context: AuthEventContext,
    userId?: string
  ): void {
    this.auditService.record({
      workspaceId: "00000000-0000-4000-8000-000000000000",
      userId,
      action: "auth.login_failed",
      entityType: "user",
      entityId: userId,
      // Never store the raw address of an unknown login attempt in plain text.
      newValues: { emailFingerprint: this.accountsService.fingerprint(email), reason },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
  }

  private async signAccessToken(
    account: Account,
    membership: Membership,
    sessionId: string
  ): Promise<string> {
    const env = getEnv();
    return new SignJWT({
      email: account.email,
      name: account.name,
      role: membership.role,
      workspaceId: membership.workspaceId,
      sid: sessionId
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(account.id)
      .setIssuer(env.JWT_ISSUER)
      .setAudience(env.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.accessSecret());
  }

  private accessSecret(): Uint8Array {
    return new TextEncoder().encode(getEnv().JWT_ACCESS_SECRET);
  }
}
