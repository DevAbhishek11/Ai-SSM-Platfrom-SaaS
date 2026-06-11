import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import { CompleteUploadDto, CreateUploadIntentDto, FailProcessingJobDto } from "./dto.js";
import { MediaService } from "./media.service.js";

@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get("assets")
  @RequirePermissions("media.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List workspace media assets" })
  assets(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.mediaService.listAssets(workspaceId);
  }

  @Post("upload-intents")
  @RequirePermissions("media.manage")
  @ApiCreatedResponse({ description: "Create a constrained upload intent" })
  uploadIntent(@Body() input: CreateUploadIntentDto) {
    return this.mediaService.createUploadIntent(input);
  }

  @Get("processing-jobs")
  @RequirePermissions("media.manage")
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List media processing jobs" })
  processingJobs(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.mediaService.listProcessingJobs(workspaceId);
  }

  @Post("uploads/complete")
  @RequirePermissions("media.manage")
  @ApiCreatedResponse({ description: "Complete an upload and create a processing job" })
  completeUpload(@Body() input: CompleteUploadDto) {
    return this.mediaService.completeUpload(input);
  }

  @Post("processing-jobs/:id/process-next")
  @RequirePermissions("media.manage")
  @ApiOkResponse({ description: "Advance a media processing job by one pipeline step" })
  processNext(@Param("id") id: string) {
    return this.mediaService.processNext(id);
  }

  @Post("processing-jobs/:id/fail")
  @RequirePermissions("media.manage")
  @ApiOkResponse({ description: "Mark a media processing job as failed" })
  fail(@Param("id") id: string, @Body() input: FailProcessingJobDto) {
    return this.mediaService.failJob(id, input.errorMessage, input.step);
  }
}
