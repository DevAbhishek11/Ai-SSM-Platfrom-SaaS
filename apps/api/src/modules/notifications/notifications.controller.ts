import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoUser, demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { RouteNotificationDto, UpdateNotificationPreferencesDto } from "./dto.js";
import { NotificationsService } from "./notifications.service.js";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions("posts.view")
  @ApiQuery({ name: "userId", required: false })
  @ApiOkResponse({ description: "List notifications for a user" })
  list(@Query("userId") userId = demoUser.id) {
    return this.notificationsService.list(userId);
  }

  @Patch(":id/read")
  @RequirePermissions("posts.view")
  @ApiOkResponse({ description: "Mark a notification as read" })
  markRead(@Param("id") id: string) {
    return this.notificationsService.markRead(id);
  }

  @Get("preferences")
  @RequirePermissions("posts.view")
  @ApiQuery({ name: "userId", required: false })
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Notification preferences for a user and workspace" })
  preferences(
    @Query("userId") userId = demoUser.id,
    @Query("workspaceId") workspaceId = demoWorkspace.id
  ) {
    return this.notificationsService.getPreferences(userId, workspaceId);
  }

  @Patch("preferences")
  @RequirePermissions("posts.view")
  @ApiQuery({ name: "userId", required: false })
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Update notification preferences" })
  updatePreferences(
    @Body() input: UpdateNotificationPreferencesDto,
    @CurrentUser() user: Principal,
    @Query("userId") userId = demoUser.id,
    @Query("workspaceId") workspaceId = demoWorkspace.id
  ) {
    return this.notificationsService.updatePreferences(userId, workspaceId, input, user);
  }

  @Get("deliveries")
  @RequirePermissions("workspace.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "userId", required: false })
  @ApiOkResponse({ description: "Notification delivery attempts" })
  deliveries(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("userId") userId?: string
  ) {
    return this.notificationsService.listDeliveryAttempts(workspaceId, userId);
  }

  @Post("route")
  @RequirePermissions("posts.view")
  @ApiOkResponse({ description: "Create and route a notification through enabled channels" })
  route(@Body() input: RouteNotificationDto, @CurrentUser() user: Principal) {
    return this.notificationsService.route(input, user);
  }
}
