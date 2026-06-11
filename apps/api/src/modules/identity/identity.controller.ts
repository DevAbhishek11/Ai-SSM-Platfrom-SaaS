import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { CreateSsoConnectionDto, TrustDeviceDto } from "./dto.js";
import { IdentityService } from "./identity.service.js";

@ApiTags("identity")
@Controller("identity")
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get("sso-connections")
  @RequirePermissions("workspace.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List workspace SSO connections" })
  ssoConnections(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.identityService.listSsoConnections(workspaceId);
  }

  @Post("sso-connections")
  @RequirePermissions("workspace.manage")
  @ApiCreatedResponse({ description: "Create an SSO connection" })
  createSsoConnection(@Body() input: CreateSsoConnectionDto, @CurrentUser() user: Principal) {
    return this.identityService.createSsoConnection(input, user);
  }

  @Post("sso-connections/:id/test")
  @RequirePermissions("workspace.manage")
  @ApiCreatedResponse({ description: "Test and activate an SSO connection" })
  testSsoConnection(@Param("id") id: string, @CurrentUser() user: Principal) {
    return this.identityService.testSsoConnection(id, user);
  }

  @Post("sso-connections/:id/disable")
  @RequirePermissions("workspace.manage")
  @ApiCreatedResponse({ description: "Disable an SSO connection" })
  disableSsoConnection(@Param("id") id: string, @CurrentUser() user: Principal) {
    return this.identityService.disableSsoConnection(id, user);
  }

  @Get("sessions")
  @RequirePermissions("workspace.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "userId", required: false })
  @ApiOkResponse({ description: "List active and historical auth sessions" })
  sessions(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("userId") userId?: string
  ) {
    return this.identityService.listSessions(workspaceId, userId);
  }

  @Post("sessions/:id/revoke")
  @RequirePermissions("workspace.manage")
  @ApiCreatedResponse({ description: "Revoke an auth session" })
  revokeSession(@Param("id") id: string, @CurrentUser() user: Principal) {
    return this.identityService.revokeSession(id, user);
  }

  @Get("devices")
  @RequirePermissions("workspace.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "userId", required: false })
  @ApiOkResponse({ description: "List trusted devices" })
  devices(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("userId") userId?: string
  ) {
    return this.identityService.listTrustedDevices(workspaceId, userId);
  }

  @Post("devices/:id/trust")
  @RequirePermissions("workspace.manage")
  @ApiCreatedResponse({ description: "Trust a pending device" })
  trustDevice(
    @Param("id") id: string,
    @Body() input: TrustDeviceDto,
    @CurrentUser() user: Principal
  ) {
    return this.identityService.trustDevice(id, input, user);
  }

  @Post("devices/:id/revoke")
  @RequirePermissions("workspace.manage")
  @ApiCreatedResponse({ description: "Revoke a trusted device and its active sessions" })
  revokeDevice(@Param("id") id: string, @CurrentUser() user: Principal) {
    return this.identityService.revokeDevice(id, user);
  }
}
