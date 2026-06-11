import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { CompleteOAuthDto, StartOAuthDto, ValidateScopesDto } from "./dto.js";
import { SocialService } from "./social.service.js";

@ApiTags("social")
@Controller("social")
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get("accounts")
  @RequirePermissions("social_accounts.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Connected social accounts and token health" })
  accounts(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.socialService.listAccounts(workspaceId);
  }

  @Get("account-health")
  @RequirePermissions("social_accounts.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Social account health summary" })
  accountHealth(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.socialService.getAccountHealth(workspaceId);
  }

  @Get("platform-capabilities")
  @RequirePermissions("posts.view")
  @ApiOkResponse({ description: "Supported platform capability matrix" })
  platformCapabilities() {
    return this.socialService.platformCapabilities();
  }

  @Post("oauth/authorize")
  @RequirePermissions("social_accounts.manage")
  @ApiCreatedResponse({ description: "Create a provider OAuth state and authorization URL" })
  authorize(@Body() input: StartOAuthDto, @CurrentUser() user: Principal) {
    return this.socialService.startOAuth(input, user);
  }

  @Post("oauth/callback")
  @RequirePermissions("social_accounts.manage")
  @ApiCreatedResponse({ description: "Consume OAuth callback state and connect an account" })
  callback(@Body() input: CompleteOAuthDto, @CurrentUser() user: Principal) {
    return this.socialService.completeOAuth(input, user);
  }

  @Get("oauth/states")
  @RequirePermissions("social_accounts.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "OAuth state audit trail for a workspace" })
  oauthStates(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.socialService.listOAuthStates(workspaceId);
  }

  @Post("accounts/:accountId/refresh-token")
  @RequirePermissions("social_accounts.manage")
  @ApiCreatedResponse({ description: "Refresh a social account access token" })
  refreshToken(@Param("accountId") accountId: string, @CurrentUser() user: Principal) {
    return this.socialService.refreshToken(accountId, user);
  }

  @Post("accounts/:accountId/validate-scopes")
  @RequirePermissions("social_accounts.manage")
  @ApiCreatedResponse({ description: "Validate required provider scopes for an account" })
  validateScopes(
    @Param("accountId") accountId: string,
    @Body() input: ValidateScopesDto,
    @CurrentUser() user: Principal
  ) {
    return this.socialService.validateScopes(accountId, input, user);
  }

  @Get("rate-limits")
  @RequirePermissions("social_accounts.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Social provider rate limit buckets" })
  rateLimits(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.socialService.listRateLimits(workspaceId);
  }

  @Get("connector-events")
  @RequirePermissions("social_accounts.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Social connector lifecycle events" })
  connectorEvents(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.socialService.listConnectorEvents(workspaceId);
  }
}
