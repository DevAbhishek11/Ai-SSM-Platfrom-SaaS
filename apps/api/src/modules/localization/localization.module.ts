import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { LocalizationController } from "./localization.controller.js";
import { LocalizationService } from "./localization.service.js";

@Module({
  imports: [AuditModule],
  controllers: [LocalizationController],
  providers: [LocalizationService],
  exports: [LocalizationService]
})
export class LocalizationModule {}
