import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { SocialService } from "./social.service.js";

@ApiTags("social")
@Controller("social")
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get("accounts")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Connected social accounts and token health" })
  accounts(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.socialService.listAccounts(workspaceId);
  }

  @Get("account-health")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Social account health summary" })
  accountHealth(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.socialService.getAccountHealth(workspaceId);
  }

  @Get("platform-capabilities")
  @ApiOkResponse({ description: "Supported platform capability matrix" })
  platformCapabilities() {
    return this.socialService.platformCapabilities();
  }
}
