import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { CreateUploadIntentDto } from "./dto.js";
import { MediaService } from "./media.service.js";

@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get("assets")
  @RequirePermissions("media.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List workspace media assets" })
  assets(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.mediaService.listAssets(workspaceId);
  }

  @Post("upload-intents")
  @RequirePermissions("media.manage")
  @ApiCreatedResponse({ description: "Create a constrained upload intent" })
  uploadIntent(@Body() input: CreateUploadIntentDto) {
    return this.mediaService.createUploadIntent(input);
  }
}
