import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { PublishingController } from "./publishing.controller.js";
import { PublishingService } from "./publishing.service.js";

@Module({
  imports: [RepositoriesModule, AuditModule],
  controllers: [PublishingController],
  providers: [PublishingService],
  exports: [PublishingService]
})
export class PublishingModule {}
