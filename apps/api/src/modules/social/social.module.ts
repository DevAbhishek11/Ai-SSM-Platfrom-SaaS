import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { BillingModule } from "../billing/billing.module.js";
import { SocialController } from "./social.controller.js";
import { SocialService } from "./social.service.js";

@Module({
  imports: [AuditModule, BillingModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService]
})
export class SocialModule {}
