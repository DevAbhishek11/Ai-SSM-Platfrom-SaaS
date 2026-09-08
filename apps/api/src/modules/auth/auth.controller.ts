import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  Patch,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { Public } from "../../common/public.decorator.js";
import type { Principal } from "../../common/principal.js";
import {
  ChangePasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  SwitchWorkspaceDto,
  UpdateProfileDto
} from "./dto.js";
import { AuthService } from "./auth.service.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  // Signup is unauthenticated and expensive (Argon2), so it gets a tight budget.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Create an account, its first workspace, and a session" })
  @ApiCreatedResponse({ description: "Account created and tokens issued" })
  async register(
    @Body() input: RegisterDto,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.register(input, { ipAddress, userAgent });
  }

  @Public()
  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Exchange credentials for an access token and refresh token" })
  @ApiCreatedResponse({ description: "Session established" })
  async login(
    @Body() input: LoginDto,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.login(input.email, input.password, { ipAddress, userAgent }, input.workspaceId);
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Rotate a refresh token and issue a new access token" })
  @ApiOkResponse({ description: "New token pair issued" })
  async refresh(
    @Body() input: RefreshTokenDto,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.refresh(input.refreshToken, { ipAddress, userAgent });
  }

  @Public()
  @Post("logout")
  @HttpCode(200)
  @ApiOperation({ summary: "Revoke the refresh token backing the current session" })
  @ApiOkResponse({ description: "Session revoked" })
  async logout(
    @Body() input: LogoutDto,
    @CurrentUser() principal?: Principal,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.logout(input.refreshToken, principal, { ipAddress, userAgent });
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Current account, workspace membership, role, and permissions" })
  @ApiOkResponse({ description: "Authenticated principal" })
  async me(@CurrentUser() principal?: Principal) {
    return this.authService.me(this.require(principal));
  }

  @Get("session")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Validate the bearer token and return the caller principal" })
  @ApiOkResponse({ description: "Token principal" })
  session(@CurrentUser() principal?: Principal) {
    return this.require(principal);
  }

  @Get("sessions")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List active sessions for the current account" })
  @ApiOkResponse({ description: "Active sessions" })
  sessions(@CurrentUser() principal?: Principal) {
    return this.authService.listSessions(this.require(principal));
  }

  @Post("sessions/:id/revoke")
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke one of the current account's sessions" })
  @ApiOkResponse({ description: "Session revoked" })
  revokeSession(@Param("id") sessionId: string, @CurrentUser() principal?: Principal) {
    return this.authService.revokeSession(this.require(principal), sessionId);
  }

  @Patch("password")
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Change the password and revoke every existing session" })
  @ApiOkResponse({ description: "Password updated" })
  async changePassword(
    @Body() input: ChangePasswordDto,
    @CurrentUser() principal?: Principal,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.changePassword(
      this.require(principal),
      input.currentPassword,
      input.newPassword,
      { ipAddress, userAgent }
    );
  }

  @Patch("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the current account profile" })
  @ApiOkResponse({ description: "Profile updated" })
  async updateProfile(
    @Body() input: UpdateProfileDto,
    @CurrentUser() principal?: Principal,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.updateProfile(this.require(principal), input, { ipAddress, userAgent });
  }

  @Post("switch-workspace")
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Issue tokens scoped to another workspace membership" })
  @ApiOkResponse({ description: "Workspace switched" })
  async switchWorkspace(
    @Body() input: SwitchWorkspaceDto,
    @CurrentUser() principal?: Principal,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.authService.switchWorkspace(this.require(principal), input.workspaceId, {
      ipAddress,
      userAgent
    });
  }

  private require(principal?: Principal): Principal {
    if (!principal) {
      throw new UnauthorizedException("Authentication required");
    }

    return principal;
  }
}
