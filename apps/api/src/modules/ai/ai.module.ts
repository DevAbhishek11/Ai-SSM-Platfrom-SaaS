import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module.js";
import { AiController } from "./ai.controller.js";
import { AiService } from "./ai.service.js";

@Module({
  imports: [BillingModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService]
})
export class AiModule {}
