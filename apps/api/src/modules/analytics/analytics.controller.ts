import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { AnalyticsService } from "./analytics.service.js";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("summary")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Workspace analytics summary" })
  summary(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.analyticsService.getSummary(workspaceId);
  }
}
