import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { WebhooksService } from "./webhooks.service.js";

@ApiTags("webhooks")
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get("deliveries")
  @RequirePermissions("webhooks.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List webhook delivery attempts" })
  deliveries(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.webhooksService.listDeliveries(workspaceId);
  }

  @Post("deliveries/:id/replay")
  @RequirePermissions("webhooks.manage")
  @ApiOkResponse({ description: "Replay a failed or pending webhook delivery" })
  replay(@Param("id") id: string) {
    return this.webhooksService.replay(id);
  }
}
