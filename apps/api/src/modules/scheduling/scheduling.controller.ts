import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  demoWorkspace,
  scheduleRuleStatuses,
  scheduleSlotStatuses,
  type ScheduleRuleStatus,
  type ScheduleSlotStatus
} from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import {
  CreateScheduleRuleDto,
  RecommendScheduleSlotsDto,
  ReserveScheduleSlotDto
} from "./dto.js";
import { SchedulingService } from "./scheduling.service.js";

@ApiTags("scheduling")
@Controller("scheduling")
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get("rules")
  @RequirePermissions("posts.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "status", enum: scheduleRuleStatuses, required: false })
  @ApiOkResponse({ description: "List smart scheduling rules" })
  rules(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("status") status?: ScheduleRuleStatus
  ) {
    return this.schedulingService.listRules(workspaceId, status);
  }

  @Post("rules")
  @RequirePermissions("posts.schedule")
  @ApiCreatedResponse({ description: "Create a smart scheduling rule" })
  createRule(@Body() input: CreateScheduleRuleDto, @CurrentUser() user: Principal) {
    return this.schedulingService.createRule(input, user);
  }

  @Get("slots")
  @RequirePermissions("posts.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "status", enum: scheduleSlotStatuses, required: false })
  @ApiOkResponse({ description: "List recommended and reserved schedule slots" })
  slots(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("status") status?: ScheduleSlotStatus
  ) {
    return this.schedulingService.listSlots(workspaceId, status);
  }

  @Post("recommendations")
  @RequirePermissions("posts.schedule")
  @ApiCreatedResponse({ description: "Generate smart schedule slot recommendations" })
  recommend(@Body() input: RecommendScheduleSlotsDto, @CurrentUser() user: Principal) {
    return this.schedulingService.recommendSlots(input, user);
  }

  @Post("slots/:id/reserve")
  @RequirePermissions("posts.schedule")
  @ApiCreatedResponse({ description: "Reserve a schedule slot and optionally schedule a post" })
  reserve(
    @Param("id") id: string,
    @Body() input: ReserveScheduleSlotDto,
    @CurrentUser() user: Principal
  ) {
    return this.schedulingService.reserveSlot(id, input, user);
  }
}
