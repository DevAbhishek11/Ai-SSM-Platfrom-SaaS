import { createHash, randomBytes, randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { demoApiKeys, permissions, type ApiKey, type Permission } from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import { BillingService } from "../billing/billing.service.js";
import type { CreateApiKeyDto } from "./dto.js";

type PublicApiKey = Omit<ApiKey, "secretHash">;

@Injectable()
export class ApiKeysService {
  private readonly apiKeys: ApiKey[] = demoApiKeys.map((apiKey) => ({
    ...apiKey,
    scopes: [...apiKey.scopes]
  }));

  constructor(
    private readonly auditService: AuditService,
    private readonly billingService: BillingService
  ) {}

  list(workspaceId: string) {
    return this.apiKeys
      .filter((apiKey) => apiKey.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((apiKey) => this.present(apiKey));
  }

  create(input: CreateApiKeyDto, user: Principal) {
    this.billingService.assertAllowed(input.workspaceId, "apiAccess", 1);
    if (input.scopes.length === 0) {
      throw new BadRequestException("At least one scope is required");
    }

    const secret = `ssm_live_${randomBytes(32).toString("base64url")}`;
    const keyPrefix = secret.slice(0, 17);
    const now = new Date().toISOString();
    const apiKey: ApiKey = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      keyPrefix,
      secretHash: this.hashSecret(secret),
      scopes: [...new Set(input.scopes)],
      status: "active",
      createdBy: user.userId,
      createdAt: now,
      expiresAt: input.expiresAt
    };

    this.apiKeys.unshift(apiKey);
    this.auditService.record({
      workspaceId: input.workspaceId,
      userId: user.userId,
      action: "api_keys.created",
      entityType: "api_key",
      entityId: apiKey.id,
      newValues: {
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt
      }
    });

    return {
      apiKey: this.present(apiKey),
      secret
    };
  }

  revoke(id: string, user: Principal) {
    const apiKey = this.findById(id);
    if (apiKey.status !== "active") {
      throw new BadRequestException("Only active API keys can be revoked");
    }

    apiKey.status = "revoked";
    apiKey.revokedAt = new Date().toISOString();
    this.auditService.record({
      workspaceId: apiKey.workspaceId,
      userId: user.userId,
      action: "api_keys.revoked",
      entityType: "api_key",
      entityId: apiKey.id,
      oldValues: { status: "active" },
      newValues: { status: apiKey.status, revokedAt: apiKey.revokedAt }
    });
    return this.present(apiKey);
  }

  verifySecret(secret: string): Principal | undefined {
    const secretHash = this.hashSecret(secret);
    const apiKey = this.apiKeys.find((item) => item.secretHash === secretHash);
    if (!apiKey || apiKey.status !== "active") {
      return undefined;
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now()) {
      apiKey.status = "expired";
      return undefined;
    }

    apiKey.lastUsedAt = new Date().toISOString();
    const validPermissions = new Set<string>(permissions);
    const scopedPermissions = apiKey.scopes.filter((scope): scope is Permission =>
      validPermissions.has(scope)
    );

    this.auditService.record({
      workspaceId: apiKey.workspaceId,
      userId: apiKey.createdBy,
      action: "api_keys.authenticated",
      entityType: "api_key",
      entityId: apiKey.id,
      newValues: {
        keyPrefix: apiKey.keyPrefix,
        scopes: scopedPermissions,
        lastUsedAt: apiKey.lastUsedAt
      }
    });

    return {
      userId: apiKey.id,
      email: `${apiKey.keyPrefix}@api-key.ssm.local`,
      role: "api_service_account",
      workspaceId: apiKey.workspaceId,
      permissions: scopedPermissions
    };
  }

  private findById(id: string): ApiKey {
    const apiKey = this.apiKeys.find((item) => item.id === id);
    if (!apiKey) {
      throw new NotFoundException("API key not found");
    }
    return apiKey;
  }

  private hashSecret(secret: string) {
    return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
  }

  private present(apiKey: ApiKey): PublicApiKey {
    return {
      id: apiKey.id,
      workspaceId: apiKey.workspaceId,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      status: apiKey.status,
      createdBy: apiKey.createdBy,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      revokedAt: apiKey.revokedAt
    };
  }
}
