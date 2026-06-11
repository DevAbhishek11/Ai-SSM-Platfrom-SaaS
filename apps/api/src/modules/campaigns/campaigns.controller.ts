import { Body, Controller, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { CampaignsService } from "./campaigns.service.js";
import {
  CreateCampaignTaskDto,
  GenerateCampaignReportDto,
  UpdateCampaignTaskStatusDto,
  UpsertCampaignBudgetLineDto
} from "./dto.js";

@ApiTags("campaigns")
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermissions("campaigns.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List campaigns for a workspace" })
  list(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.campaignsService.list(workspaceId);
  }

  @Get(":id")
  @RequirePermissions("campaigns.view")
  @ApiOkResponse({ description: "Get campaign details with operational summary" })
  get(@Param("id") id: string) {
    const campaign = this.campaignsService.get(id);
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    return campaign;
  }

  @Get(":id/milestones")
  @RequirePermissions("campaigns.view")
  @ApiOkResponse({ description: "List campaign milestones" })
  milestones(@Param("id") id: string) {
    return this.campaignsService.listMilestones(id);
  }

  @Post("milestones/:milestoneId/complete")
  @RequirePermissions("campaigns.manage")
  @ApiCreatedResponse({ description: "Complete a campaign milestone" })
  completeMilestone(
    @Param("milestoneId") milestoneId: string,
    @CurrentUser() user: Principal
  ) {
    return this.campaignsService.completeMilestone(milestoneId, user);
  }

  @Get(":id/tasks")
  @RequirePermissions("campaigns.view")
  @ApiOkResponse({ description: "List campaign tasks" })
  tasks(@Param("id") id: string) {
    return this.campaignsService.listTasks(id);
  }

  @Post(":id/tasks")
  @RequirePermissions("campaigns.manage")
  @ApiCreatedResponse({ description: "Create a campaign task" })
  createTask(
    @Param("id") id: string,
    @Body() input: CreateCampaignTaskDto,
    @CurrentUser() user: Principal
  ) {
    return this.campaignsService.createTask(id, input, user);
  }

  @Post("tasks/:taskId/status")
  @RequirePermissions("campaigns.manage")
  @ApiCreatedResponse({ description: "Update a campaign task status" })
  updateTaskStatus(
    @Param("taskId") taskId: string,
    @Body() input: UpdateCampaignTaskStatusDto,
    @CurrentUser() user: Principal
  ) {
    return this.campaignsService.updateTaskStatus(taskId, input, user);
  }

  @Get(":id/budget")
  @RequirePermissions("campaigns.view")
  @ApiOkResponse({ description: "Campaign budget lines and utilization" })
  budget(@Param("id") id: string) {
    return this.campaignsService.getBudget(id);
  }

  @Post(":id/budget-lines")
  @RequirePermissions("campaigns.manage")
  @ApiCreatedResponse({ description: "Create or update a campaign budget line" })
  upsertBudgetLine(
    @Param("id") id: string,
    @Body() input: UpsertCampaignBudgetLineDto,
    @CurrentUser() user: Principal
  ) {
    return this.campaignsService.upsertBudgetLine(id, input, user);
  }

  @Get(":id/reports")
  @RequirePermissions("analytics.view")
  @ApiOkResponse({ description: "List generated campaign reports" })
  reports(@Param("id") id: string) {
    return this.campaignsService.listReports(id);
  }

  @Post(":id/reports/generate")
  @RequirePermissions("analytics.export")
  @ApiCreatedResponse({ description: "Generate a campaign report" })
  generateReport(
    @Param("id") id: string,
    @Body() input: GenerateCampaignReportDto,
    @CurrentUser() user: Principal
  ) {
    return this.campaignsService.generateReport(id, input, user);
  }
}
