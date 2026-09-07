import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module.js";
import { BrandVoicesModule } from "../brand-voices/brand-voices.module.js";
import { SafetyModule } from "../safety/safety.module.js";
import { AI_CONFIG, AI_FETCH, loadAiConfig } from "./ai.config.js";
import { AiController } from "./ai.controller.js";
import { AiService } from "./ai.service.js";
import { ModelRouterService } from "./model-router.service.js";
import type { FetchLike } from "./providers/types.js";

@Module({
  imports: [BillingModule, BrandVoicesModule, SafetyModule],
  controllers: [AiController],
  providers: [
    {
      provide: AI_CONFIG,
      useFactory: () => loadAiConfig()
    },
    {
      provide: AI_FETCH,
      useValue: ((input, init) => globalThis.fetch(input, init)) satisfies FetchLike
    },
    ModelRouterService,
    AiService
  ],
  exports: [AiService, ModelRouterService]
})
export class AiModule {}
