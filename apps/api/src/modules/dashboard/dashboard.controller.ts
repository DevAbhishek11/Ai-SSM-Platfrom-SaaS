import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { DashboardService } from "./dashboard.service.js";

@ApiTags("dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Executive workspace dashboard overview" })
  overview(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.dashboardService.getOverview(workspaceId);
  }
}
