import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module.js";
import { ContentModule } from "../content/content.module.js";
import { MembersModule } from "../members/members.module.js";
import { PostsModule } from "../posts/posts.module.js";
import { SocialModule } from "../social/social.module.js";
import { SearchController } from "./search.controller.js";
import { SearchService } from "./search.service.js";

@Module({
  imports: [PostsModule, CampaignsModule, SocialModule, MembersModule, ContentModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService]
})
export class SearchModule {}
