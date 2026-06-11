import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { CompleteOnboardingStepDto, SkipOnboardingStepDto } from "./dto.js";
import { OnboardingService } from "./onboarding.service.js";

@ApiTags("onboarding")
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get("checklist")
  @RequirePermissions("workspace.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Workspace activation checklist and progress" })
  checklist(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.onboardingService.checklist(workspaceId);
  }

  @Post("steps/:id/complete")
  @RequirePermissions("workspace.manage")
  @ApiCreatedResponse({ description: "Complete an onboarding step" })
  complete(
    @Param("id") id: string,
    @Body() input: CompleteOnboardingStepDto,
    @CurrentUser() user: Principal
  ) {
    return this.onboardingService.complete(id, input, user);
  }

  @Post("steps/:id/skip")
  @RequirePermissions("workspace.manage")
  @ApiCreatedResponse({ description: "Skip an onboarding step" })
  skip(
    @Param("id") id: string,
    @Body() input: SkipOnboardingStepDto,
    @CurrentUser() user: Principal
  ) {
    return this.onboardingService.skip(id, input, user);
  }
}
