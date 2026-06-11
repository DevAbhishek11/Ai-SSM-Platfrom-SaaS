import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { AuditService } from "./audit.service.js";

@ApiTags("audit")
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("logs")
  @RequirePermissions("audit.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "action", required: false })
  @ApiQuery({ name: "entityType", required: false })
  @ApiQuery({ name: "userId", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiOkResponse({ description: "Tenant-scoped audit log records" })
  logs(
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("action") action?: string,
    @Query("entityType") entityType?: string,
    @Query("userId") userId?: string,
    @Query("limit") limit?: string
  ) {
    return this.auditService.listLogs(workspaceId, {
      action,
      entityType,
      userId,
      limit: limit ? Number(limit) : undefined
    });
  }

  @Get("summary")
  @RequirePermissions("audit.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Audit log summary and risk signal counts" })
  summary(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.auditService.summary(workspaceId);
  }

  @Get("export")
  @RequirePermissions("audit.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "JSON audit export for compliance review" })
  export(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.auditService.exportLogs(workspaceId);
  }
}
