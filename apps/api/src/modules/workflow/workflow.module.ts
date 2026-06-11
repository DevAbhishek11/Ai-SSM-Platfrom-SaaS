import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { WorkflowController } from "./workflow.controller.js";
import { WorkflowService } from "./workflow.service.js";

@Module({
  imports: [RepositoriesModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService]
})
export class WorkflowModule {}
