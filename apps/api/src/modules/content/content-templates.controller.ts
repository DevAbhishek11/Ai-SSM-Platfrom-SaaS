import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { contentTemplateStatuses, demoWorkspace, type ContentTemplateStatus } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { ContentTemplatesService } from "./content-templates.service.js";
import { CreateContentTemplateDto, UseContentTemplateDto } from "./dto.js";

@ApiTags("content")
@Controller("content")
export class ContentTemplatesController {
  constructor(private readonly contentTemplatesService: ContentTemplatesService) {}

  @Get("templates")
  @RequirePermissions("posts.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "status", enum: contentTemplateStatuses, required: false })
  @ApiOkResponse({ description: "List reusable content templates" })
  templates(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("status") status?: ContentTemplateStatus
  ) {
    return this.contentTemplatesService.list(workspaceId, status);
  }

  @Post("templates")
  @RequirePermissions("posts.create")
  @ApiCreatedResponse({ description: "Create a reusable content template" })
  createTemplate(@Body() input: CreateContentTemplateDto, @CurrentUser() user: Principal) {
    return this.contentTemplatesService.create(input, user);
  }

  @Post("templates/:id/use")
  @RequirePermissions("posts.create")
  @ApiCreatedResponse({ description: "Create a draft or scheduled post from a content template" })
  useTemplate(
    @Param("id") id: string,
    @Body() input: UseContentTemplateDto,
    @CurrentUser() user: Principal
  ) {
    return this.contentTemplatesService.useTemplate(id, input, user);
  }
}
