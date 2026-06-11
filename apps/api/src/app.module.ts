import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { RequestContextMiddleware } from "./common/request-context.middleware.js";
import { AiModule } from "./modules/ai/ai.module.js";
import { AnalyticsModule } from "./modules/analytics/analytics.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { PostsModule } from "./modules/posts/posts.module.js";
import { SocialModule } from "./modules/social/social.module.js";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120
      }
    ]),
    HealthModule,
    DashboardModule,
    WorkspacesModule,
    PostsModule,
    AiModule,
    AnalyticsModule,
    SocialModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
