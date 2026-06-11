import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { demoUser, demoWorkspace, hasPermission, rolePermissions, type Role } from "@ssm/domain";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator.js";
import type { Permission } from "@ssm/domain";
import type { Principal } from "./principal.js";

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
    const principal = request.user ?? this.buildDevelopmentPrincipal(request);
    request.user = principal;

    return required.every(
      (permission) =>
        principal.permissions.includes(permission) && hasPermission(principal.role, permission)
    );
  }

  private buildDevelopmentPrincipal(request: Request): Principal {
    const roleHeader = request.header("x-user-role");
    const role = this.isRole(roleHeader) ? roleHeader : "owner";
    const workspaceId = request.header("x-workspace-id") ?? demoWorkspace.id;

    return {
      userId: demoUser.id,
      email: demoUser.email,
      role,
      workspaceId,
      permissions: rolePermissions[role]
    };
  }

  private isRole(value: string | undefined): value is Role {
    return (
      value === "super_admin" ||
      value === "owner" ||
      value === "admin" ||
      value === "manager" ||
      value === "creator" ||
      value === "reviewer" ||
      value === "viewer" ||
      value === "api_service_account"
    );
  }
}
