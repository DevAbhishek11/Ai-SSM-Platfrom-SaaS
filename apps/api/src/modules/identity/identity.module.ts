import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";

@Module({
  imports: [AuditModule],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService]
})
export class IdentityModule {}
