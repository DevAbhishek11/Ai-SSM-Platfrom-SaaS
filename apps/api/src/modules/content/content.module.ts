import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { PostsModule } from "../posts/posts.module.js";
import { ContentTemplatesController } from "./content-templates.controller.js";
import { ContentTemplatesService } from "./content-templates.service.js";

@Module({
  imports: [AuditModule, PostsModule],
  controllers: [ContentTemplatesController],
  providers: [ContentTemplatesService],
  exports: [ContentTemplatesService]
})
export class ContentModule {}
