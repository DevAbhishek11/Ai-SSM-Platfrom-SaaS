import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { WorkflowController } from "./workflow.controller.js";
import { WorkflowService } from "./workflow.service.js";

@Module({
  imports: [RepositoriesModule, AuditModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService]
})
export class WorkflowModule {}
