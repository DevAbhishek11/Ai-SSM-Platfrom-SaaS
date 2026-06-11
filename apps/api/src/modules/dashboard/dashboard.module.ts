import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module.js";
import { PostsModule } from "../posts/posts.module.js";
import { SocialModule } from "../social/social.module.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";

@Module({
  imports: [AnalyticsModule, PostsModule, SocialModule],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}
