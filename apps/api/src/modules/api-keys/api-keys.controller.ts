import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { ApiKeysService } from "./api-keys.service.js";
import { CreateApiKeyDto } from "./dto.js";

@ApiTags("api-keys")
@Controller("api-keys")
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @RequirePermissions("api_keys.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Workspace API keys without raw secrets" })
  list(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.apiKeysService.list(workspaceId);
  }

  @Post()
  @RequirePermissions("api_keys.manage")
  @ApiCreatedResponse({ description: "Create a scoped API key and return the raw secret once" })
  create(@Body() input: CreateApiKeyDto, @CurrentUser() user: Principal) {
    return this.apiKeysService.create(input, user);
  }

  @Post(":id/revoke")
  @RequirePermissions("api_keys.manage")
  @ApiCreatedResponse({ description: "Revoke an active API key" })
  revoke(@Param("id") id: string, @CurrentUser() user: Principal) {
    return this.apiKeysService.revoke(id, user);
  }
}
