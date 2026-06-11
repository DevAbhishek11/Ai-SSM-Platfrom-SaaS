import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { PermissionsGuard } from "./common/permissions.guard.js";
import { RequestContextMiddleware } from "./common/request-context.middleware.js";
import { AiModule } from "./modules/ai/ai.module.js";
import { AnalyticsModule } from "./modules/analytics/analytics.module.js";
import { ApiKeyAuthGuard } from "./modules/api-keys/api-key-auth.guard.js";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module.js";
import { AuditModule } from "./modules/audit/audit.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { BillingModule } from "./modules/billing/billing.module.js";
import { BrandVoicesModule } from "./modules/brand-voices/brand-voices.module.js";
import { CampaignsModule } from "./modules/campaigns/campaigns.module.js";
import { ContentModule } from "./modules/content/content.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { DatabaseModule } from "./modules/database/database.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { ListeningModule } from "./modules/listening/listening.module.js";
import { MediaModule } from "./modules/media/media.module.js";
import { MembersModule } from "./modules/members/members.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { PostsModule } from "./modules/posts/posts.module.js";
import { PublishingModule } from "./modules/publishing/publishing.module.js";
import { RepositoriesModule } from "./modules/repositories/repositories.module.js";
import { ReportsModule } from "./modules/reports/reports.module.js";
import { SafetyModule } from "./modules/safety/safety.module.js";
import { SchedulingModule } from "./modules/scheduling/scheduling.module.js";
import { SocialModule } from "./modules/social/social.module.js";
import { WebhooksModule } from "./modules/webhooks/webhooks.module.js";
import { WorkflowModule } from "./modules/workflow/workflow.module.js";
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
    DatabaseModule,
    RepositoriesModule,
    AuditModule,
    AuthModule,
    HealthModule,
    DashboardModule,
    WorkspacesModule,
    MembersModule,
    ApiKeysModule,
    PostsModule,
    ContentModule,
    CampaignsModule,
    MediaModule,
    NotificationsModule,
    BillingModule,
    BrandVoicesModule,
    WebhooksModule,
    PublishingModule,
    SchedulingModule,
    WorkflowModule,
    AiModule,
    AnalyticsModule,
    ReportsModule,
    IdentityModule,
    ListeningModule,
    SafetyModule,
    SocialModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
