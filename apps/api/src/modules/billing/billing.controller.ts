import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { BillingService } from "./billing.service.js";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("plans")
  @ApiOkResponse({ description: "Plan capabilities and limits" })
  plans() {
    return this.billingService.plans();
  }

  @Get("usage")
  @RequirePermissions("billing.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "Current workspace usage against plan limits" })
  usage(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.billingService.usage(workspaceId);
  }
}
