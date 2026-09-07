import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { jwtVerify, SignJWT } from "jose";
import type { Role } from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { getEnv } from "../../common/env.js";
import { AuditService } from "../audit/audit.service.js";
import { AccountsService, type Account, type Membership } from "./accounts.service.js";
import { SessionsService } from "./sessions.service.js";

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
    private readonly auditService: AuditService
  ) {}

  async register(
    input: { email: string; password: string; name: string; workspaceName?: string; timezone?: string },
    context: AuthEventContext = {}
  ): Promise<AuthResult> {
    if (!getEnv().AUTH_REGISTRATION_ENABLED) {
      throw new ForbiddenException("Self-service registration is disabled for this deployment");
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
    const account = await this.accountsService.findByEmail(email);

    if (!account) {
      // Spend the same Argon2 budget as a real verification so response time
      // does not disclose whether the address exists.
      await this.accountsService.burnTiming(password);
      this.recordFailedLogin(email, "unknown_email", context);
      throw new UnauthorizedException("Invalid email or password");
    }

    if (account.status !== "active") {
      this.recordFailedLogin(email, `account_${account.status}`, context, account.id);
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!(await this.accountsService.verifyPassword(account, password))) {
      this.recordFailedLogin(email, "bad_password", context, account.id);
      throw new UnauthorizedException("Invalid email or password");
    }

    const membership = this.accountsService.membershipFor(account, workspaceId);
    this.accountsService.markLogin(account);

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
    const rotated = this.sessionsService.rotate(refreshToken, context);
    if (!rotated) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const account = await this.accountsService.findById(rotated.session.userId);
    if (!account || account.status !== "active") {
      this.sessionsService.revoke(rotated.session.id, "account_unavailable");
      throw new UnauthorizedException("Invalid or expired refresh token");
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
      throw new UnauthorizedException("Account not found");
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
      throw new UnauthorizedException("Account not found");
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
    if (!session || session.userId !== principal.userId) {
      throw new UnauthorizedException("Session not found");
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
      throw new UnauthorizedException("Invalid or expired access token");
    }

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.workspaceId !== "string"
    ) {
      throw new UnauthorizedException("Invalid token payload");
    }

    const role = payload.role as Role;
    const permissions = this.accountsService.permissionsFor(role);
    if (permissions.length === 0 && role !== "viewer") {
      throw new UnauthorizedException("Invalid token role");
    }

    // A revoked session must not keep working until the access token expires.
    const sessionId = typeof payload.sid === "string" ? payload.sid : undefined;
    if (sessionId) {
      const session = this.sessionsService.findById(sessionId);
      if (session?.revokedAt) {
        throw new UnauthorizedException("Session has been revoked");
      }
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
