import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AccountsService } from "./accounts.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { SessionsService } from "./sessions.service.js";

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AccountsService, SessionsService, AuthService],
  exports: [AuthService, AccountsService, SessionsService]
})
export class AuthModule {}
