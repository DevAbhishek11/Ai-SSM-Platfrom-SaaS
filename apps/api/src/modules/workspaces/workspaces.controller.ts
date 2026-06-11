import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { WorkspacesService } from "./workspaces.service.js";

@ApiTags("workspaces")
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @RequirePermissions("workspace.manage")
  @ApiOkResponse({ description: "List workspaces available to the caller" })
  list() {
    return this.workspacesService.list();
  }

  @Get(":id")
  @RequirePermissions("workspace.manage")
  @ApiOkResponse({ description: "Get a workspace by id" })
  get(@Param("id") id: string) {
    const workspace = this.workspacesService.getById(id);
    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }
    return workspace;
  }
}
