import { Injectable, UnauthorizedException } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";
import { jwtVerify, SignJWT } from "jose";
import { demoUser, demoWorkspace, rolePermissions } from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { getEnv } from "../../common/env.js";
import { AuditService } from "../audit/audit.service.js";

type AuthEventContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  private demoPasswordHash: string | undefined;

  constructor(private readonly auditService: AuditService) {}

  async login(email: string, password: string, context: AuthEventContext = {}) {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== demoUser.email) {
      this.auditService.record({
        workspaceId: demoWorkspace.id,
        action: "auth.login_failed",
        entityType: "user",
        newValues: { email: normalizedEmail, reason: "unknown_email" },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordHash = await this.getDemoPasswordHash();
    const validPassword = await verify(passwordHash, password);
    if (!validPassword) {
      this.auditService.record({
        workspaceId: demoWorkspace.id,
        userId: demoUser.id,
        action: "auth.login_failed",
        entityType: "user",
        entityId: demoUser.id,
        newValues: { email: normalizedEmail, reason: "bad_password" },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const principal: Principal = {
      userId: demoUser.id,
      email: demoUser.email,
      role: "owner",
      workspaceId: demoWorkspace.id,
      permissions: rolePermissions.owner
    };

    this.auditService.record({
      workspaceId: demoWorkspace.id,
      userId: demoUser.id,
      action: "auth.login_succeeded",
      entityType: "session",
      newValues: { role: principal.role, email: principal.email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      accessToken: await this.signAccessToken(principal),
      tokenType: "Bearer",
      expiresIn: 900,
      user: demoUser,
      workspaceId: demoWorkspace.id,
      role: principal.role,
      permissions: principal.permissions
    };
  }

  async verifyAccessToken(token: string): Promise<Principal> {
    const env = getEnv();
    let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
    try {
      const verified = await jwtVerify(token, this.secret(), {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE
      });
      payload = verified.payload;
    } catch {
      throw new UnauthorizedException("Invalid bearer token");
    }

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.workspaceId !== "string"
    ) {
      throw new UnauthorizedException("Invalid token payload");
    }

    const role = payload.role;
    if (!(role in rolePermissions)) {
      throw new UnauthorizedException("Invalid token role");
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: role as keyof typeof rolePermissions,
      workspaceId: payload.workspaceId,
      permissions: rolePermissions[role as keyof typeof rolePermissions]
    };
  }

  extractBearerToken(authorization: string | undefined): string | undefined {
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(" ");
    return type?.toLowerCase() === "bearer" && token ? token : undefined;
  }

  private async signAccessToken(principal: Principal): Promise<string> {
    const env = getEnv();
    return new SignJWT({
      email: principal.email,
      role: principal.role,
      workspaceId: principal.workspaceId
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(principal.userId)
      .setIssuer(env.JWT_ISSUER)
      .setAudience(env.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(this.secret());
  }

  private async getDemoPasswordHash(): Promise<string> {
    if (!this.demoPasswordHash) {
      this.demoPasswordHash = await hash(getEnv().DEMO_USER_PASSWORD);
    }

    return this.demoPasswordHash;
  }

  private secret(): Uint8Array {
    return new TextEncoder().encode(getEnv().JWT_ACCESS_SECRET);
  }
}
