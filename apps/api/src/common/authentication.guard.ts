import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { demoUser, demoWorkspace, rolePermissions, roles, type Role } from "@ssm/domain";
import { getEnv } from "./env.js";
import { IS_PUBLIC_KEY } from "./public.decorator.js";
import type { Principal } from "./principal.js";
import { AuthService } from "../modules/auth/auth.service.js";

/**
 * Global authentication gate.
 *
 * Every route requires a principal unless it is explicitly marked `@Public()`.
 * Principals come from (in order): an API key resolved by `ApiKeyAuthGuard`, a
 * signed bearer access token, or - only when `AUTH_ALLOW_DEV_HEADERS=true` and
 * the process is not running in production - request headers. The header path
 * exists for automated tests; it used to be the *default* behaviour, which made
 * every endpoint impersonatable with a single `x-user-role: owner` header.
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticationGuard.name);
  private warnedAboutDevHeaders = false;

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: Principal }>();
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? false;

    // An API key guard may already have resolved a service-account principal.
    if (request.user) {
      return true;
    }

    const token = this.authService.extractBearerToken(request.header("authorization"));
    if (token) {
      try {
        request.user = { ...(await this.authService.verifyAccessToken(token)), kind: "user" };
        return true;
      } catch (error) {
        if (!isPublic) {
          throw error;
        }
      }
    }

    const devPrincipal = this.buildDevelopmentPrincipal(request);
    if (devPrincipal) {
      request.user = devPrincipal;
      return true;
    }

    if (isPublic) {
      return true;
    }

    throw new UnauthorizedException("Authentication required");
  }

  private buildDevelopmentPrincipal(request: Request): Principal | undefined {
    const env = getEnv();
    if (!env.AUTH_ALLOW_DEV_HEADERS || env.NODE_ENV === "production") {
      return undefined;
    }

    const roleHeader = request.header("x-user-role");
    if (!roleHeader) {
      return undefined;
    }

    if (!this.isRole(roleHeader)) {
      throw new UnauthorizedException("Unknown role in x-user-role header");
    }

    if (!this.warnedAboutDevHeaders) {
      this.warnedAboutDevHeaders = true;
      this.logger.warn(
        "AUTH_ALLOW_DEV_HEADERS is enabled: x-user-role headers are accepted in place of a signed session. Never enable this outside tests."
      );
    }

    return {
      userId: demoUser.id,
      email: demoUser.email,
      role: roleHeader,
      workspaceId: request.header("x-workspace-id") ?? demoWorkspace.id,
      permissions: [...rolePermissions[roleHeader]],
      kind: "development"
    };
  }

  private isRole(value: string): value is Role {
    return (roles as readonly string[]).includes(value);
  }
}
