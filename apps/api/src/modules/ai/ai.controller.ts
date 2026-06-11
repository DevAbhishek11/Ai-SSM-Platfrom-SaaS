import { Body, Controller, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { GenerateContentDto } from "./dto.js";
import { AiService } from "./ai.service.js";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("generate")
  @RequirePermissions("ai.generate")
  @ApiCreatedResponse({ description: "Generate platform-aware social content variants" })
  generate(@Body() input: GenerateContentDto) {
    return this.aiService.generate(input);
  }
}
