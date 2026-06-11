import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import {
  CreateReportExportDto,
  CreateReportShareLinkDto,
  CreateReportTemplateDto,
  CreateScheduledReportDto
} from "./dto.js";
import { ReportsService } from "./reports.service.js";

@ApiTags("reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("templates")
  @RequirePermissions("analytics.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List report templates" })
  templates(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.reportsService.listTemplates(workspaceId);
  }

  @Post("templates")
  @RequirePermissions("analytics.export")
  @ApiCreatedResponse({ description: "Create a report template" })
  createTemplate(@Body() input: CreateReportTemplateDto, @CurrentUser() user: Principal) {
    return this.reportsService.createTemplate(input, user);
  }

  @Get("schedules")
  @RequirePermissions("analytics.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List scheduled reports" })
  schedules(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.reportsService.listSchedules(workspaceId);
  }

  @Post("schedules")
  @RequirePermissions("analytics.export")
  @ApiCreatedResponse({ description: "Create a scheduled report" })
  createSchedule(@Body() input: CreateScheduledReportDto, @CurrentUser() user: Principal) {
    return this.reportsService.createSchedule(input, user);
  }

  @Get("exports")
  @RequirePermissions("analytics.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List report exports" })
  exports(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.reportsService.listExports(workspaceId);
  }

  @Post("exports")
  @RequirePermissions("analytics.export")
  @ApiCreatedResponse({ description: "Create a report export" })
  createExport(@Body() input: CreateReportExportDto, @CurrentUser() user: Principal) {
    return this.reportsService.createExport(input, user);
  }

  @Get("share-links")
  @RequirePermissions("analytics.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List report share links" })
  shareLinks(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.reportsService.listShareLinks(workspaceId);
  }

  @Post("exports/:exportId/share-links")
  @RequirePermissions("analytics.export")
  @ApiCreatedResponse({ description: "Create a report share link" })
  createShareLink(
    @Param("exportId") exportId: string,
    @Body() input: CreateReportShareLinkDto,
    @CurrentUser() user: Principal
  ) {
    return this.reportsService.createShareLink(exportId, input, user);
  }
}
