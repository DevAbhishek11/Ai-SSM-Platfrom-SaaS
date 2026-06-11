import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  demoWorkspace,
  listeningMonitorStatuses,
  type ListeningMonitorStatus
} from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { CreateListeningMonitorDto, IngestSocialMentionDto } from "./dto.js";
import { ListeningService } from "./listening.service.js";

@ApiTags("listening")
@Controller("listening")
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  @Get("summary")
  @RequirePermissions("analytics.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Social listening summary for a workspace" })
  summary(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.listeningService.summary(workspaceId);
  }

  @Get("monitors")
  @RequirePermissions("analytics.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "status", enum: listeningMonitorStatuses, required: false })
  @ApiOkResponse({ description: "List social listening monitors" })
  monitors(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("status") status?: string
  ) {
    return this.listeningService.listMonitors(workspaceId, this.parseStatus(status));
  }

  @Post("monitors")
  @RequirePermissions("campaigns.manage")
  @ApiCreatedResponse({ description: "Create a social listening monitor" })
  createMonitor(@Body() input: CreateListeningMonitorDto, @CurrentUser() user: Principal) {
    return this.listeningService.createMonitor(input, user);
  }

  @Post("monitors/:monitorId/pause")
  @RequirePermissions("campaigns.manage")
  @ApiCreatedResponse({ description: "Pause a social listening monitor" })
  pauseMonitor(@Param("monitorId") monitorId: string, @CurrentUser() user: Principal) {
    return this.listeningService.setMonitorStatus(monitorId, "paused", user);
  }

  @Post("monitors/:monitorId/resume")
  @RequirePermissions("campaigns.manage")
  @ApiCreatedResponse({ description: "Resume a social listening monitor" })
  resumeMonitor(@Param("monitorId") monitorId: string, @CurrentUser() user: Principal) {
    return this.listeningService.setMonitorStatus(monitorId, "active", user);
  }

  @Post("monitors/:monitorId/archive")
  @RequirePermissions("campaigns.manage")
  @ApiCreatedResponse({ description: "Archive a social listening monitor" })
  archiveMonitor(@Param("monitorId") monitorId: string, @CurrentUser() user: Principal) {
    return this.listeningService.setMonitorStatus(monitorId, "archived", user);
  }

  @Get("mentions")
  @RequirePermissions("analytics.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "monitorId", required: false })
  @ApiOkResponse({ description: "List detected social mentions" })
  mentions(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("monitorId") monitorId?: string
  ) {
    return this.listeningService.listMentions(workspaceId, monitorId);
  }

  @Post("mentions")
  @RequirePermissions("analytics.export")
  @ApiCreatedResponse({ description: "Ingest a social mention and create an alert when needed" })
  ingestMention(@Body() input: IngestSocialMentionDto, @CurrentUser() user: Principal) {
    return this.listeningService.ingestMention(input, user);
  }

  @Get("alerts")
  @RequirePermissions("analytics.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "resolved", required: false })
  @ApiOkResponse({ description: "List social listening alerts" })
  alerts(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("resolved") resolved?: string
  ) {
    return this.listeningService.listAlerts(workspaceId, this.parseResolved(resolved));
  }

  @Post("alerts/:alertId/resolve")
  @RequirePermissions("campaigns.manage")
  @ApiCreatedResponse({ description: "Resolve a social listening alert" })
  resolveAlert(@Param("alertId") alertId: string, @CurrentUser() user: Principal) {
    return this.listeningService.resolveAlert(alertId, user);
  }

  private parseStatus(status?: string): ListeningMonitorStatus | undefined {
    if (!status) {
      return undefined;
    }
    if (!listeningMonitorStatuses.includes(status as ListeningMonitorStatus)) {
      throw new BadRequestException("Invalid monitor status");
    }
    return status as ListeningMonitorStatus;
  }

  private parseResolved(resolved?: string): boolean | undefined {
    if (resolved === undefined) {
      return undefined;
    }
    if (resolved === "true") {
      return true;
    }
    if (resolved === "false") {
      return false;
    }
    throw new BadRequestException("resolved must be true or false");
  }
}
