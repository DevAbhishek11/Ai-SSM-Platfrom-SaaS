import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { GenerateContentDto, SubmitGenerationFeedbackDto } from "./dto.js";
import { AiService } from "./ai.service.js";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("generate")
  @RequirePermissions("ai.generate")
  @ApiCreatedResponse({ description: "Generate platform-aware social content variants" })
  generate(@Body() input: GenerateContentDto, @CurrentUser() user?: Principal) {
    return this.aiService.generate(input, user);
  }

  @Get("providers")
  @RequirePermissions("ai.generate")
  @ApiQuery({ name: "probe", required: false, description: "Probe provider reachability" })
  @ApiOkResponse({ description: "Configured AI providers, routing order, and fallback policy" })
  providers(@Query("probe") probe?: string) {
    return this.aiService.providerStatus(probe === "true" || probe === "1");
  }

  @Get("generations")
  @RequirePermissions("ai.generate")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "AI generation audit log with provider routing metadata" })
  generations(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.aiService.listGenerations(workspaceId);
  }

  @Post("generations/:id/feedback")
  @RequirePermissions("ai.generate")
  @ApiCreatedResponse({ description: "Record thumbs up/down feedback for an AI generation" })
  feedback(@Param("id") id: string, @Body() input: SubmitGenerationFeedbackDto) {
    return this.aiService.submitFeedback(id, input);
  }
}
