import { Body, Controller, Get, Post as HttpPost, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { demoWorkspace } from "@ssm/domain";
import { CreatePostDto } from "./dto.js";
import { PostsService } from "./posts.service.js";

@ApiTags("posts")
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiQuery({ name: "workspaceId", required: false })
  @ApiOkResponse({ description: "List posts for a workspace" })
  list(@Query("workspaceId") workspaceId = demoWorkspace.id) {
    return this.postsService.list({ workspaceId });
  }

  @HttpPost()
  @ApiCreatedResponse({ description: "Create a draft or scheduled post" })
  create(@Body() input: CreatePostDto) {
    return this.postsService.create(input);
  }
}
