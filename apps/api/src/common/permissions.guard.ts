import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { hasPermission } from "@ssm/domain";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator.js";
import type { Permission } from "@ssm/domain";
import type { Principal } from "./principal.js";

/**
 * Authorization gate. Authentication has already happened in
 * `AuthenticationGuard`, so a missing principal here means the route is public
 * but permission-guarded, which is a configuration error rather than a
 * legitimate anonymous request.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: Principal }>();
    const principal = request.user;

    if (!principal) {
      throw new ForbiddenException("Authentication required for this resource");
    }

    const granted = required.every(
      (permission) =>
        principal.permissions.includes(permission) && hasPermission(principal.role, permission)
    );

    if (!granted) {
      const missing = required.filter((permission) => !principal.permissions.includes(permission));
      throw new ForbiddenException(
        `Role "${principal.role}" is missing required permission(s): ${missing.join(", ")}`
      );
    }

    return true;
  }
}
