import { Body, Controller, Get, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { LoginDto } from "./dto.js";
import { AuthService } from "./auth.service.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiCreatedResponse({ description: "Issue access token for a valid user session" })
  async login(@Body() input: LoginDto) {
    return this.authService.login(input.email, input.password);
  }

  @Get("session")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Validate bearer token and return caller principal" })
  async session(@Headers("authorization") authorization?: string) {
    const token = this.authService.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    return this.authService.verifyAccessToken(token);
  }
}
