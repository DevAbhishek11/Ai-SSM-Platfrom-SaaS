import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { BrandVoicesService } from "./brand-voices.service.js";
import { CreateBrandVoiceDto, EvaluateBrandVoiceDto, UpdateBrandVoiceDto } from "./dto.js";

@ApiTags("brand-voices")
@Controller("brand-voices")
export class BrandVoicesController {
  constructor(private readonly brandVoicesService: BrandVoicesService) {}

  @Get()
  @RequirePermissions("ai.generate")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Workspace brand voice profiles" })
  list(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.brandVoicesService.list(workspaceId);
  }

  @Get(":id")
  @RequirePermissions("ai.generate")
  @ApiOkResponse({ description: "Brand voice profile" })
  get(@Param("id") id: string) {
    return this.brandVoicesService.get(id);
  }

  @Post()
  @RequirePermissions("brand_voice.manage")
  @ApiCreatedResponse({ description: "Create a brand voice profile" })
  create(@Body() input: CreateBrandVoiceDto, @CurrentUser() user: Principal) {
    return this.brandVoicesService.create(input, user);
  }

  @Put(":id")
  @RequirePermissions("brand_voice.manage")
  @ApiOkResponse({ description: "Update a brand voice profile and increment version" })
  update(
    @Param("id") id: string,
    @Body() input: UpdateBrandVoiceDto,
    @CurrentUser() user: Principal
  ) {
    return this.brandVoicesService.update(id, input, user);
  }

  @Post(":id/duplicate")
  @RequirePermissions("brand_voice.manage")
  @ApiCreatedResponse({ description: "Duplicate a brand voice profile" })
  duplicate(@Param("id") id: string, @CurrentUser() user: Principal) {
    return this.brandVoicesService.duplicate(id, user);
  }

  @Post(":id/evaluate")
  @RequirePermissions("ai.generate")
  @ApiCreatedResponse({ description: "Evaluate content against a brand voice" })
  evaluate(@Param("id") id: string, @Body() input: EvaluateBrandVoiceDto) {
    return this.brandVoicesService.evaluate(id, input);
  }
}
