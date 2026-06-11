import { Module } from "@nestjs/common";
import { PublishingController } from "./publishing.controller.js";
import { PublishingService } from "./publishing.service.js";

@Module({
  controllers: [PublishingController],
  providers: [PublishingService],
  exports: [PublishingService]
})
export class PublishingModule {}
