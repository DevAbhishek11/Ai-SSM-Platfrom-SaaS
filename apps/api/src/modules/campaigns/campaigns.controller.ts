import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { CampaignsService } from "./campaigns.service.js";

@ApiTags("campaigns")
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermissions("campaigns.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List campaigns for a workspace" })
  list(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.campaignsService.list(workspaceId);
  }

  @Get(":id")
  @RequirePermissions("campaigns.view")
  @ApiOkResponse({ description: "Get campaign details with operational summary" })
  get(@Param("id") id: string) {
    const campaign = this.campaignsService.get(id);
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    return campaign;
  }
}
