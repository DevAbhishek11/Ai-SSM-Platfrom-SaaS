import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../../common/permissions.decorator.js";
import type { Principal } from "../../common/principal.js";
import { SearchQueryDto } from "./dto.js";
import { SearchService } from "./search.service.js";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermissions("posts.view")
  @ApiOperation({ summary: "Search posts, campaigns, media, accounts, templates and people" })
  @ApiOkResponse({ description: "Ranked hits, grouped by kind" })
  search(@Query() query: SearchQueryDto, @CurrentUser() user: Principal) {
    return this.searchService.search(query, user);
  }
}
