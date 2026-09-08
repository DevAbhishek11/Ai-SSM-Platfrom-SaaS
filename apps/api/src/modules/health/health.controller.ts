import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/public.decorator.js";
import { DatabaseService } from "../database/database.service.js";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Public()
  @Get("health")
  @ApiOkResponse({ description: "Liveness probe" })
  health() {
    return {
      status: "ok",
      service: "ssm-api",
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get("ready")
  @ApiOkResponse({ description: "Readiness probe" })
  async ready() {
    return {
      status: "ready",
      checks: {
        api: true,
        database: await this.databaseService.health(),
        redis: "configured"
      },
      timestamp: new Date().toISOString()
    };
  }
}
