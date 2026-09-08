import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { AddPostCommentDto, BulkWorkflowDto, SchedulePostDto, WorkflowCommentDto } from "./dto.js";
import { WorkflowService } from "./workflow.service.js";

@ApiTags("workflow")
@Controller("workflow/posts")
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post("bulk")
  @HttpCode(200)
  @RequirePermissions("posts.review")
  @ApiOkResponse({
    description: "Apply one workflow action to many posts; each id reports its own outcome"
  })
  bulk(@Body() input: BulkWorkflowDto, @CurrentUser() user: Principal) {
    return this.workflowService.bulk(input.postIds, input.action, user, input.comment);
  }

  @Post(":postId/comments")
  @RequirePermissions("posts.view")
  @ApiOkResponse({ description: "Add a review comment without changing the post status" })
  comment(
    @Param("postId", new ParseUUIDPipe()) postId: string,
    @Body() input: AddPostCommentDto,
    @CurrentUser() user: Principal
  ) {
    return this.workflowService.comment(postId, input.body, user);
  }

  @Post("comments/:commentId/resolve")
  @HttpCode(200)
  @RequirePermissions("posts.view")
  @ApiOkResponse({ description: "Mark a review comment as resolved" })
  resolveComment(
    @Param("commentId", new ParseUUIDPipe()) commentId: string,
    @CurrentUser() user: Principal
  ) {
    return this.workflowService.resolveComment(commentId, user);
  }

  @Get(":postId/timeline")
  @RequirePermissions("posts.view")
  @ApiOkResponse({ description: "Post comments and workflow events" })
  timeline(@Param("postId") postId: string) {
    return this.workflowService.timeline(postId);
  }

  @Post(":postId/submit")
  @RequirePermissions("posts.edit")
  @ApiOkResponse({ description: "Submit a draft post for review" })
  submit(
    @Param("postId") postId: string,
    @Body() input: WorkflowCommentDto,
    @CurrentUser() user: Principal
  ) {
    return this.workflowService.transition(postId, "in_review", user, "submitted_for_review", input.comment);
  }

  @Post(":postId/approve")
  @RequirePermissions("posts.review")
  @ApiOkResponse({ description: "Approve a post for scheduling" })
  approve(
    @Param("postId") postId: string,
    @Body() input: WorkflowCommentDto,
    @CurrentUser() user: Principal
  ) {
    return this.workflowService.transition(postId, "approved", user, "approved", input.comment);
  }

  @Post(":postId/request-changes")
  @RequirePermissions("posts.review")
  @ApiOkResponse({ description: "Request changes on a post" })
  requestChanges(
    @Param("postId") postId: string,
    @Body() input: WorkflowCommentDto,
    @CurrentUser() user: Principal
  ) {
    return this.workflowService.transition(
      postId,
      "revisions_needed",
      user,
      "changes_requested",
      input.comment
    );
  }

  @Post(":postId/schedule")
  @RequirePermissions("posts.schedule")
  @ApiOkResponse({ description: "Schedule an approved post" })
  schedule(
    @Param("postId") postId: string,
    @Body() input: SchedulePostDto,
    @CurrentUser() user: Principal
  ) {
    return this.workflowService.schedule(postId, input.scheduledAt, user, input.comment);
  }

  @Post(":postId/cancel")
  @RequirePermissions("posts.schedule")
  @ApiOkResponse({ description: "Cancel a scheduled post back to approved" })
  cancel(
    @Param("postId") postId: string,
    @Body() input: WorkflowCommentDto,
    @CurrentUser() user: Principal
  ) {
    return this.workflowService.transition(postId, "approved", user, "canceled", input.comment);
  }
}
