import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { SafetyController } from "./safety.controller.js";
import { SafetyService } from "./safety.service.js";

@Module({
  imports: [AuditModule],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService]
})
export class SafetyModule {}
