import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  demoSocialAccounts,
  demoSocialConnectorEvents,
  demoSocialOAuthStates,
  demoSocialRateLimitBuckets,
  supportedPlatformCapabilities,
  type ConnectorEventSeverity,
  type Platform,
  type SocialAccount,
  type SocialConnectorEvent,
  type SocialOAuthState,
  type SocialRateLimitBucket
} from "@ssm/domain";
import type { Principal } from "../../common/principal.js";
import { AuditService } from "../audit/audit.service.js";
import { BillingService } from "../billing/billing.service.js";
import type { CompleteOAuthDto, StartOAuthDto, ValidateScopesDto } from "./dto.js";

@Injectable()
export class SocialService {
  private readonly accounts: SocialAccount[] = demoSocialAccounts.map((account) => ({
    ...account,
    permissions: { ...account.permissions }
  }));

  private readonly oauthStates: SocialOAuthState[] = demoSocialOAuthStates.map((state) => ({
    ...state,
    scopes: [...state.scopes]
  }));

  private readonly rateLimitBuckets: SocialRateLimitBucket[] = demoSocialRateLimitBuckets.map((bucket) => ({
    ...bucket
  }));

  private readonly connectorEvents: SocialConnectorEvent[] = demoSocialConnectorEvents.map((event) => ({
    ...event,
    metadata: { ...event.metadata }
  }));

  constructor(
    private readonly auditService: AuditService,
    private readonly billingService: BillingService
  ) {}

  listAccounts(workspaceId: string) {
    return this.accounts.filter((account) => account.workspaceId === workspaceId);
  }

  getAccountHealth(workspaceId: string) {
    const accounts = this.listAccounts(workspaceId);
    const connected = accounts.filter((account) => account.status === "connected").length;
    const needsAttention = accounts.length - connected;

    return {
      total: accounts.length,
      connected,
      needsAttention,
      accounts: accounts.map((account) => ({
        id: account.id,
        platform: account.platform,
        username: account.username,
        status: account.status,
        lastSyncedAt: account.lastSyncedAt,
        actionRequired:
          account.status === "connected" ? null : "Reconnect account to refresh OAuth permissions."
      }))
    };
  }

  platformCapabilities() {
    return supportedPlatformCapabilities;
  }

  startOAuth(input: StartOAuthDto, user: Principal) {
    this.billingService.assertAllowed(input.workspaceId, "socialAccounts", 1);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60_000);
    const state = `state-${input.platform}-${randomUUID()}`;
    const redirectUri = input.redirectUri ?? "http://localhost:4000/api/social/oauth/callback";
    const scopes = input.scopes?.length ? input.scopes : this.defaultScopes(input.platform);
    const authorizationUrl = this.buildAuthorizationUrl(input.platform, state, redirectUri, scopes);

    const oauthState: SocialOAuthState = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      platform: input.platform,
      state,
      authorizationUrl,
      redirectUri,
      scopes,
      status: "pending",
      expiresAt: expiresAt.toISOString(),
      createdBy: user.userId,
      createdAt: now.toISOString()
    };

    this.oauthStates.unshift(oauthState);
    this.recordEvent({
      workspaceId: input.workspaceId,
      platform: input.platform,
      type: "oauth_started",
      severity: "info",
      message: `${this.platformLabel(input.platform)} OAuth authorization started.`,
      metadata: { scopes, expiresAt: oauthState.expiresAt }
    });
    this.auditService.record({
      workspaceId: input.workspaceId,
      userId: user.userId,
      action: "social.oauth_started",
      entityType: "social_oauth_state",
      entityId: oauthState.id,
      newValues: {
        platform: input.platform,
        scopes,
        status: oauthState.status,
        expiresAt: oauthState.expiresAt
      }
    });

    return {
      ...oauthState,
      expiresInSeconds: 600
    };
  }

  completeOAuth(input: CompleteOAuthDto, user?: Principal) {
    if (input.code.trim().length < 4) {
      throw new BadRequestException("OAuth code is invalid");
    }

    const oauthState = this.oauthStates.find((state) => state.state === input.state);
    if (!oauthState) {
      throw new NotFoundException("OAuth state not found");
    }
    if (oauthState.status !== "pending") {
      throw new BadRequestException(`OAuth state is already ${oauthState.status}`);
    }
    if (new Date(oauthState.expiresAt).getTime() <= Date.now()) {
      oauthState.status = "expired";
      this.recordEvent({
        workspaceId: oauthState.workspaceId,
        platform: oauthState.platform,
        type: "oauth_expired",
        severity: "warning",
        message: `${this.platformLabel(oauthState.platform)} OAuth state expired before callback.`,
        metadata: { state: oauthState.state }
      });
      this.auditService.record({
        workspaceId: oauthState.workspaceId,
        userId: user?.userId,
        action: "social.oauth_expired",
        entityType: "social_oauth_state",
        entityId: oauthState.id,
        oldValues: { status: "pending" },
        newValues: { status: "expired", platform: oauthState.platform }
      });
      throw new BadRequestException("OAuth state expired");
    }

    const now = new Date().toISOString();
    oauthState.status = "consumed";
    oauthState.consumedAt = now;

    const permissions = Object.fromEntries(oauthState.scopes.map((scope) => [scope, true]));
    const platformUserId = input.platformUserId ?? `${oauthState.platform}_${oauthState.state.slice(-8)}`;
    const existingAccount = this.accounts.find(
      (account) =>
        account.workspaceId === oauthState.workspaceId &&
        account.platform === oauthState.platform &&
        account.platformUserId === platformUserId
    );

    const account =
      existingAccount ??
      ({
        id: randomUUID(),
        workspaceId: oauthState.workspaceId,
        platform: oauthState.platform,
        platformUserId,
        username: input.username ?? `${oauthState.platform}-managed`,
        displayName: input.displayName ?? `${this.platformLabel(oauthState.platform)} Managed Account`,
        permissions,
        status: "connected",
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now
      } satisfies SocialAccount);

    account.username = input.username ?? account.username;
    account.displayName = input.displayName ?? account.displayName;
    account.permissions = { ...account.permissions, ...permissions };
    account.status = "connected";
    account.lastSyncedAt = now;
    account.updatedAt = now;

    if (!existingAccount) {
      this.accounts.unshift(account);
    }

    const bucket = this.upsertRateLimitBucket(account);
    this.recordEvent({
      workspaceId: account.workspaceId,
      socialAccountId: account.id,
      platform: account.platform,
      type: "oauth_completed",
      severity: "info",
      message: `${this.platformLabel(account.platform)} account @${account.username} connected.`,
      metadata: {
        scopes: oauthState.scopes,
        rateLimitBucket: bucket.bucketKey,
        codeExchange: "simulated"
      }
    });
    this.auditService.record({
      workspaceId: account.workspaceId,
      userId: user?.userId,
      action: "social.oauth_completed",
      entityType: "social_account",
      entityId: account.id,
      oldValues: { oauthStateStatus: "pending" },
      newValues: {
        oauthStateStatus: oauthState.status,
        platform: account.platform,
        username: account.username,
        scopes: oauthState.scopes
      }
    });

    return {
      account,
      oauthState
    };
  }

  refreshToken(accountId: string, user?: Principal) {
    const account = this.findAccount(accountId);
    const now = new Date().toISOString();
    const oldStatus = account.status;
    account.status = "connected";
    account.lastSyncedAt = now;
    account.updatedAt = now;

    const bucket = this.upsertRateLimitBucket(account);
    bucket.remaining = Math.max(bucket.remaining, Math.floor(bucket.limit * 0.75));
    bucket.resetAt = new Date(Date.now() + bucket.windowSeconds * 1000).toISOString();
    bucket.updatedAt = now;

    this.recordEvent({
      workspaceId: account.workspaceId,
      socialAccountId: account.id,
      platform: account.platform,
      type: "token_refreshed",
      severity: "info",
      message: `${this.platformLabel(account.platform)} token refreshed for @${account.username}.`,
      metadata: { resetAt: bucket.resetAt }
    });
    this.auditService.record({
      workspaceId: account.workspaceId,
      userId: user?.userId,
      action: "social.token_refreshed",
      entityType: "social_account",
      entityId: account.id,
      oldValues: { status: oldStatus },
      newValues: { status: account.status, lastSyncedAt: account.lastSyncedAt }
    });

    return account;
  }

  validateScopes(accountId: string, input: ValidateScopesDto, user?: Principal) {
    const account = this.findAccount(accountId);
    const requiredScopes = input.requiredScopes?.length ? input.requiredScopes : this.defaultScopes(account.platform);
    const missingScopes = requiredScopes.filter((scope) => !account.permissions[scope]);
    const valid = missingScopes.length === 0;

    this.recordEvent({
      workspaceId: account.workspaceId,
      socialAccountId: account.id,
      platform: account.platform,
      type: valid ? "scopes_validated" : "scopes_missing",
      severity: valid ? "info" : "warning",
      message: valid
        ? `${this.platformLabel(account.platform)} scopes validated for @${account.username}.`
        : `${this.platformLabel(account.platform)} is missing ${missingScopes.join(", ")} scope(s).`,
      metadata: { requiredScopes, missingScopes }
    });
    this.auditService.record({
      workspaceId: account.workspaceId,
      userId: user?.userId,
      action: valid ? "social.scopes_validated" : "social.scopes_missing",
      entityType: "social_account",
      entityId: account.id,
      newValues: { requiredScopes, missingScopes, valid }
    });

    return {
      accountId: account.id,
      platform: account.platform,
      valid,
      requiredScopes,
      missingScopes,
      checkedAt: new Date().toISOString()
    };
  }

  listOAuthStates(workspaceId: string) {
    return this.oauthStates
      .filter((state) => state.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listRateLimits(workspaceId: string) {
    return this.rateLimitBuckets
      .filter((bucket) => bucket.workspaceId === workspaceId)
      .sort((a, b) => a.resetAt.localeCompare(b.resetAt));
  }

  listConnectorEvents(workspaceId: string) {
    return this.connectorEvents
      .filter((event) => event.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private findAccount(accountId: string): SocialAccount {
    const account = this.accounts.find((item) => item.id === accountId);
    if (!account) {
      throw new NotFoundException("Social account not found");
    }
    return account;
  }

  private upsertRateLimitBucket(account: SocialAccount): SocialRateLimitBucket {
    const existing = this.rateLimitBuckets.find(
      (bucket) => bucket.socialAccountId === account.id && bucket.bucketKey === "publish"
    );
    if (existing) {
      return existing;
    }

    const defaults = this.rateLimitDefaults(account.platform);
    const now = new Date().toISOString();
    const bucket: SocialRateLimitBucket = {
      id: randomUUID(),
      workspaceId: account.workspaceId,
      socialAccountId: account.id,
      platform: account.platform,
      bucketKey: "publish",
      limit: defaults.limit,
      remaining: defaults.remaining,
      windowSeconds: defaults.windowSeconds,
      resetAt: new Date(Date.now() + defaults.windowSeconds * 1000).toISOString(),
      updatedAt: now
    };
    this.rateLimitBuckets.unshift(bucket);
    return bucket;
  }

  private recordEvent(input: {
    workspaceId: string;
    socialAccountId?: string;
    platform: Platform;
    type: string;
    severity: ConnectorEventSeverity;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const event: SocialConnectorEvent = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      socialAccountId: input.socialAccountId,
      platform: input.platform,
      type: input.type,
      severity: input.severity,
      message: input.message,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString()
    };
    this.connectorEvents.unshift(event);
    return event;
  }

  private buildAuthorizationUrl(
    platform: Platform,
    state: string,
    redirectUri: string,
    scopes: string[]
  ): string {
    const url = new URL(`https://social.example.com/${platform}/oauth/authorize`);
    url.searchParams.set("client_id", `ssm-${platform}-demo`);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  }

  private defaultScopes(platform: Platform) {
    if (platform === "x" || platform === "mastodon" || platform === "bluesky") {
      return ["publish", "insights"];
    }
    if (platform === "pinterest") {
      return ["publish", "insights", "boards"];
    }
    return ["publish", "insights", "comments"];
  }

  private rateLimitDefaults(platform: Platform) {
    if (platform === "x") {
      return { limit: 100, remaining: 75, windowSeconds: 900 };
    }
    if (platform === "linkedin") {
      return { limit: 150, remaining: 120, windowSeconds: 3600 };
    }
    if (platform === "instagram" || platform === "facebook") {
      return { limit: 200, remaining: 180, windowSeconds: 3600 };
    }
    return { limit: 120, remaining: 100, windowSeconds: 3600 };
  }

  private platformLabel(platform: Platform) {
    return platform === "x" ? "X" : platform.charAt(0).toUpperCase() + platform.slice(1);
  }
}
