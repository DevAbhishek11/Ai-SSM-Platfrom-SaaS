import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { AnalyticsService } from "./analytics.service.js";
import { InsightsQueryDto } from "./insights.dto.js";
import { InsightsService } from "./insights.service.js";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly insightsService: InsightsService
  ) {}

  @Get("summary")
  @RequirePermissions("analytics.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Workspace analytics summary" })
  summary(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.analyticsService.getSummary(workspaceId);
  }

  /**
   * Everything the reporting page needs for one window, in one response, so
   * that no two panels can describe different ranges.
   */
  @Get("insights")
  @RequirePermissions("analytics.view")
  @ApiOkResponse({ description: "Period comparison, series, anomalies, best times and leaderboards" })
  insights(@Query() query: InsightsQueryDto) {
    return this.insightsService.getInsights({
      ...query,
      workspaceId: query.workspaceId ?? demoWorkspace.id
    });
  }
}
