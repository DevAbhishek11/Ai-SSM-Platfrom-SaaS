import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { PublishingController } from "./publishing.controller.js";
import { PublishingService } from "./publishing.service.js";

@Module({
  imports: [RepositoriesModule],
  controllers: [PublishingController],
  providers: [PublishingService],
  exports: [PublishingService]
})
export class PublishingModule {}
