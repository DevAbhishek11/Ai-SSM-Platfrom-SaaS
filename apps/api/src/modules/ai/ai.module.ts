import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module.js";
import { BrandVoicesModule } from "../brand-voices/brand-voices.module.js";
import { SafetyModule } from "../safety/safety.module.js";
import { AiController } from "./ai.controller.js";
import { AiService } from "./ai.service.js";

@Module({
  imports: [BillingModule, BrandVoicesModule, SafetyModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService]
})
export class AiModule {}
