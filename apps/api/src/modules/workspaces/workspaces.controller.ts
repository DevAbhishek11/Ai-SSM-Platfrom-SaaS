import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { WorkspacesService } from "./workspaces.service.js";

@ApiTags("workspaces")
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOkResponse({ description: "List workspaces available to the caller" })
  list() {
    return this.workspacesService.list();
  }

  @Get(":id")
  @ApiOkResponse({ description: "Get a workspace by id" })
  get(@Param("id") id: string) {
    const workspace = this.workspacesService.getById(id);
    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }
    return workspace;
  }
}
