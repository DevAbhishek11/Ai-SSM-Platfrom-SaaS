import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "owner@acmegrowth.test" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: "demo-password-change-me" })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @ApiPropertyOptional({ description: "Sign in directly to a specific workspace membership" })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

export class RegisterDto {
  @ApiProperty({ example: "ada@northwind.test" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 10, example: "correct-horse-42" })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  password!: string;

  @ApiProperty({ example: "Ada Lovelace" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: "Northwind Social" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  workspaceName?: string;

  @ApiPropertyOptional({ example: "Asia/Calcutta" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: "Opaque refresh token returned by login/register" })
  @IsString()
  @MinLength(16)
  @MaxLength(500)
  refreshToken!: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ description: "Refresh token to revoke" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  refreshToken?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  currentPassword!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  newPassword!: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;
}

export class SwitchWorkspaceDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;
}
