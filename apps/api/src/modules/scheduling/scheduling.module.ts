import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { PublishingModule } from "../publishing/publishing.module.js";
import { SchedulingController } from "./scheduling.controller.js";
import { SchedulingService } from "./scheduling.service.js";

@Module({
  imports: [AuditModule, PublishingModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService]
})
export class SchedulingModule {}
