import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AccountsService } from "./accounts.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { LoginAttemptsService } from "./login-attempts.service.js";
import { SessionsService } from "./sessions.service.js";

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AccountsService, SessionsService, LoginAttemptsService, AuthService],
  exports: [AuthService, AccountsService, SessionsService, LoginAttemptsService]
})
export class AuthModule {}
