import { Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoUser } from "@ssm/domain";
import { RequirePermissions } from "../../common/permissions.decorator.js";
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
}
