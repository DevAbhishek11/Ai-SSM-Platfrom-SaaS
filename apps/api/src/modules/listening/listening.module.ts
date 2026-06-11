import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { ListeningController } from "./listening.controller.js";
import { ListeningService } from "./listening.service.js";

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ListeningController],
  providers: [ListeningService],
  exports: [ListeningService]
})
export class ListeningModule {}
