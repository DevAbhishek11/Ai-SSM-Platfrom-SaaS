import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller()
export class HealthController {
  @Get("health")
  @ApiOkResponse({ description: "Liveness probe" })
  health() {
    return {
      status: "ok",
      service: "ssm-api",
      timestamp: new Date().toISOString()
    };
  }

  @Get("ready")
  @ApiOkResponse({ description: "Readiness probe" })
  ready() {
    return {
      status: "ready",
      checks: {
        api: true,
        database: "configured",
        redis: "configured"
      },
      timestamp: new Date().toISOString()
    };
  }
}
