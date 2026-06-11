import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { BrandVoicesController } from "./brand-voices.controller.js";
import { BrandVoicesService } from "./brand-voices.service.js";

@Module({
  imports: [AuditModule],
  controllers: [BrandVoicesController],
  providers: [BrandVoicesService],
  exports: [BrandVoicesService]
})
export class BrandVoicesModule {}
