import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { Principal } from "../../common/principal.js";
import { ApiKeysService } from "./api-keys.service.js";

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: Principal }>();
    const rawApiKey = request.header("x-api-key");
    if (!rawApiKey) {
      return true;
    }

    const principal = this.apiKeysService.verifySecret(rawApiKey);
    if (!principal) {
      throw new UnauthorizedException("Invalid API key");
    }

    request.user = principal;
    return true;
  }
}
