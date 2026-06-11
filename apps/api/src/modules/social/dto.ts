import { ApiProperty } from "@nestjs/swagger";
import { platforms, type Platform } from "@ssm/domain";
import { IsArray, IsIn, IsOptional, IsString, IsUrl, IsUUID } from "class-validator";

export class StartOAuthDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ enum: platforms, example: "instagram" })
  @IsIn(platforms)
  platform!: Platform;

  @ApiProperty({ required: false, example: "http://localhost:4000/api/social/oauth/callback" })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;

  @ApiProperty({ required: false, example: ["publish", "insights", "comments"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}

export class CompleteOAuthDto {
  @ApiProperty({ example: "state-instagram-demo-20260611" })
  @IsString()
  state!: string;

  @ApiProperty({ example: "oauth-demo-code" })
  @IsString()
  code!: string;

  @ApiProperty({ required: false, example: "ig_acme" })
  @IsOptional()
  @IsString()
  platformUserId?: string;

  @ApiProperty({ required: false, example: "acmegrowth" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false, example: "Acme Growth" })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class ValidateScopesDto {
  @ApiProperty({ required: false, example: ["publish", "insights"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredScopes?: string[];
}
