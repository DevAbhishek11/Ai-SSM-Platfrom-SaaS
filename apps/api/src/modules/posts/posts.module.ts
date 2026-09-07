import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { BillingModule } from "../billing/billing.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { PostsController } from "./posts.controller.js";
import { PostsService } from "./posts.service.js";

@Module({
  imports: [RepositoriesModule, BillingModule, AuditModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService]
})
export class PostsModule {}
