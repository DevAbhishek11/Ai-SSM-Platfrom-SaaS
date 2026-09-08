import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post as HttpPost,
  Query
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { platformPostRules } from "@ssm/domain";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { CreatePostDto, ListPostsQueryDto, UpdatePostDto, ValidatePostDto } from "./dto.js";
import { PostsService } from "./posts.service.js";

@ApiTags("posts")
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @RequirePermissions("posts.view")
  @ApiOperation({ summary: "List posts with filtering, sorting and pagination" })
  @ApiOkResponse({ description: "A page of posts plus facet counts" })
  list(@Query() query: ListPostsQueryDto, @CurrentUser() user: Principal) {
    return this.postsService.list({ ...query, workspaceId: query.workspaceId ?? user.workspaceId });
  }

  /**
   * Static, cacheable description of what each network accepts. The composer
   * loads it once so counters keep working while the user is offline.
   */
  @Get("platform-rules")
  @RequirePermissions("posts.view")
  @ApiOkResponse({ description: "Per-platform composing limits" })
  platformRules() {
    return platformPostRules;
  }

  @HttpPost("validate")
  @HttpCode(200)
  @RequirePermissions("posts.view")
  @ApiOperation({ summary: "Preflight a draft against every selected platform" })
  @ApiOkResponse({ description: "Validation errors and warnings; nothing is stored" })
  validate(@Body() input: ValidatePostDto) {
    return this.postsService.validate(input);
  }

  @Get(":id")
  @RequirePermissions("posts.view")
  @ApiOkResponse({ description: "A single post" })
  findOne(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() user: Principal) {
    return this.postsService.findOne(id, user.workspaceId);
  }

  @HttpPost()
  @RequirePermissions("posts.create")
  @ApiCreatedResponse({ description: "Create a draft or scheduled post" })
  create(@Body() input: CreatePostDto, @CurrentUser() user: Principal) {
    return this.postsService.create(input, user);
  }

  @Patch(":id")
  @RequirePermissions("posts.edit")
  @ApiOperation({ summary: "Edit a post, optionally with optimistic concurrency" })
  @ApiOkResponse({ description: "The updated post" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: UpdatePostDto,
    @CurrentUser() user: Principal
  ) {
    return this.postsService.update(id, input, user);
  }

  @HttpPost(":id/duplicate")
  @RequirePermissions("posts.create")
  @ApiCreatedResponse({ description: "A draft copy of the post" })
  duplicate(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() user: Principal) {
    return this.postsService.duplicate(id, user);
  }

  @Delete(":id")
  @RequirePermissions("posts.edit")
  @ApiOperation({ summary: "Archive a post (content is retained for audit)" })
  @ApiNoContentResponse({ description: "The archived post" })
  archive(@Param("id", new ParseUUIDPipe()) id: string, @CurrentUser() user: Principal) {
    return this.postsService.archive(id, user);
  }
}
