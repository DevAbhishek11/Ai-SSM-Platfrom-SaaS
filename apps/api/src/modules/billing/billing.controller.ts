import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
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

  @Get("entitlements/check")
  @RequirePermissions("billing.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiQuery({ name: "capability", required: true })
  @ApiQuery({ name: "increment", required: false })
  @ApiOkResponse({ description: "Projected entitlement decision for a workspace capability" })
  entitlementCheck(
    @Query("capability") capability: string | undefined,
    @Query("workspaceId") workspaceId = demoWorkspace.id,
    @Query("increment") increment?: string
  ) {
    if (!this.billingService.isCapability(capability)) {
      throw new BadRequestException("Invalid entitlement capability");
    }
    return this.billingService.check(workspaceId, capability, increment ? Number(increment) : 0);
  }
}
