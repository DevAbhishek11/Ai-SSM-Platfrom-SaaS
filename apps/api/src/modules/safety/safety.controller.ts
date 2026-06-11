import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace, moderationStatuses, type ModerationStatus } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { CreateSafetyPolicyDto, EvaluateContentSafetyDto, ResolveModerationItemDto } from "./dto.js";
import { SafetyService } from "./safety.service.js";

@ApiTags("safety")
@Controller("safety")
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Get("policies")
  @RequirePermissions("ai.generate")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List AI safety policies" })
  policies(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.safetyService.listPolicies(workspaceId);
  }

  @Post("policies")
  @RequirePermissions("brand_voice.manage")
  @ApiCreatedResponse({ description: "Create an AI safety policy" })
  createPolicy(@Body() input: CreateSafetyPolicyDto, @CurrentUser() user: Principal) {
    return this.safetyService.createPolicy(input, user);
  }

  @Post("evaluate")
  @RequirePermissions("ai.generate")
  @ApiCreatedResponse({ description: "Evaluate content against workspace safety policy" })
  evaluate(@Body() input: EvaluateContentSafetyDto, @CurrentUser() user: Principal) {
    return this.safetyService.evaluate(input, user);
  }

  @Get("checks")
  @RequirePermissions("ai.generate")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List content safety checks" })
  checks(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.safetyService.listChecks(workspaceId);
  }

  @Get("moderation-queue")
  @RequirePermissions("posts.review")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "status", enum: moderationStatuses, required: false })
  @ApiOkResponse({ description: "List AI moderation queue items" })
  moderationQueue(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("status") status?: ModerationStatus
  ) {
    return this.safetyService.listModerationQueue(workspaceId, status);
  }

  @Post("moderation-queue/:id/resolve")
  @RequirePermissions("posts.review")
  @ApiCreatedResponse({ description: "Resolve an AI moderation queue item" })
  resolveModerationItem(
    @Param("id") id: string,
    @Body() input: ResolveModerationItemDto,
    @CurrentUser() user: Principal
  ) {
    return this.safetyService.resolveModerationItem(id, input, user);
  }
}
