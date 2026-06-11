import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { EnqueuePublishingJobsDto } from "./dto.js";
import { PublishingService } from "./publishing.service.js";

@ApiTags("publishing")
@Controller("publishing")
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

  @Get("jobs")
  @RequirePermissions("posts.view")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List publishing jobs for a workspace" })
  jobs(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.publishingService.listJobs(workspaceId);
  }

  @Post("jobs/enqueue")
  @RequirePermissions("posts.publish")
  @ApiCreatedResponse({ description: "Create idempotent publishing jobs for a post" })
  enqueue(@Body() input: EnqueuePublishingJobsDto) {
    return this.publishingService.enqueue(input);
  }

  @Post("jobs/process-due")
  @RequirePermissions("posts.publish")
  @ApiOkResponse({ description: "Process due queued and retrying jobs" })
  processDue(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.publishingService.processDue(workspaceId);
  }

  @Post("jobs/:id/process")
  @RequirePermissions("posts.publish")
  @ApiOkResponse({ description: "Process a single publishing job" })
  process(@Param("id") id: string) {
    return this.publishingService.processJob(id);
  }

  @Post("jobs/:id/retry")
  @RequirePermissions("posts.publish")
  @ApiOkResponse({ description: "Schedule a failed publishing job for retry" })
  retry(@Param("id") id: string) {
    return this.publishingService.retry(id);
  }
}
