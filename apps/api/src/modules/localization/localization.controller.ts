import { Body, Controller, Get, Patch, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoUser, demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import {
  UpdateLocalizationPreferenceDto,
  UpdateRegionalComplianceProfileDto
} from "./dto.js";
import { LocalizationService } from "./localization.service.js";

@ApiTags("localization")
@Controller("localization")
export class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  @Get("capabilities")
  @RequirePermissions("workspace.manage")
  @ApiOkResponse({ description: "Supported locales, formats, residency regions, and regulations" })
  capabilities() {
    return this.localizationService.capabilities();
  }

  @Get("preferences")
  @RequirePermissions("workspace.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "userId", required: false })
  @ApiOkResponse({ description: "Localization preferences for a user/workspace" })
  preference(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("userId") userId = demoUser.id
  ) {
    return this.localizationService.getPreference(workspaceId, userId);
  }

  @Patch("preferences")
  @RequirePermissions("workspace.manage")
  @ApiOkResponse({ description: "Update localization preferences" })
  updatePreference(
    @Body() input: UpdateLocalizationPreferenceDto,
    @CurrentUser() user: Principal
  ) {
    return this.localizationService.updatePreference(input, user);
  }

  @Get("compliance-profile")
  @RequirePermissions("workspace.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Workspace regional compliance profile" })
  complianceProfile(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.localizationService.getComplianceProfile(workspaceId);
  }

  @Patch("compliance-profile")
  @RequirePermissions("workspace.manage")
  @ApiOkResponse({ description: "Update regional compliance profile" })
  updateComplianceProfile(
    @Body() input: UpdateRegionalComplianceProfileDto,
    @CurrentUser() user: Principal
  ) {
    return this.localizationService.updateComplianceProfile(input, user);
  }
}
