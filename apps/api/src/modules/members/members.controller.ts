import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { InviteMemberDto, UpdateMemberRoleDto } from "./dto.js";
import { MembersService } from "./members.service.js";

@ApiTags("members")
@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequirePermissions("members.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Workspace team members" })
  members(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.membersService.listMembers(workspaceId);
  }

  @Get("invitations")
  @RequirePermissions("members.invite")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Workspace invitations" })
  invitations(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.membersService.listInvitations(workspaceId);
  }

  @Post("invitations")
  @RequirePermissions("members.invite")
  @ApiCreatedResponse({ description: "Create a workspace invitation" })
  invite(@Body() input: InviteMemberDto, @CurrentUser() user: Principal) {
    return this.membersService.invite(input, user);
  }

  @Post("invitations/:id/resend")
  @RequirePermissions("members.invite")
  @ApiCreatedResponse({ description: "Resend a pending workspace invitation" })
  resend(@Param("id") id: string, @CurrentUser() user: Principal) {
    return this.membersService.resendInvitation(id, user);
  }

  @Post("invitations/:id/revoke")
  @RequirePermissions("members.invite")
  @ApiCreatedResponse({ description: "Revoke a pending workspace invitation" })
  revoke(@Param("id") id: string, @CurrentUser() user: Principal) {
    return this.membersService.revokeInvitation(id, user);
  }

  @Post(":memberId/role")
  @RequirePermissions("members.manage")
  @ApiCreatedResponse({ description: "Update a team member role" })
  updateRole(
    @Param("memberId") memberId: string,
    @Body() input: UpdateMemberRoleDto,
    @CurrentUser() user: Principal
  ) {
    return this.membersService.updateRole(memberId, input.role, user);
  }

  @Post(":memberId/suspend")
  @RequirePermissions("members.manage")
  @ApiCreatedResponse({ description: "Suspend a team member" })
  suspend(@Param("memberId") memberId: string, @CurrentUser() user: Principal) {
    return this.membersService.suspend(memberId, user);
  }
}
