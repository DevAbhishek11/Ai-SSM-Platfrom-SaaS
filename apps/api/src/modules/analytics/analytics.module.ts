import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { AnalyticsController } from "./analytics.controller.js";
import { AnalyticsService } from "./analytics.service.js";
import { InsightsService } from "./insights.service.js";

@Module({
  imports: [RepositoriesModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, InsightsService],
  exports: [AnalyticsService, InsightsService]
})
export class AnalyticsModule {}
