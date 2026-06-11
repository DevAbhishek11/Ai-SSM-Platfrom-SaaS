import { ApiProperty } from "@nestjs/swagger";
import { ssoProviderTypes, type SsoProviderType } from "@ssm/domain";
import { IsIn, IsObject, IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateSsoConnectionDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ enum: ssoProviderTypes, example: "okta" })
  @IsIn(ssoProviderTypes)
  providerType!: SsoProviderType;

  @ApiProperty({ example: "acmegrowth.test" })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  domain!: string;

  @ApiProperty({ example: "https://acmegrowth.okta.example.com/app/ssm" })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  entityId!: string;

  @ApiProperty({ example: "https://acmegrowth.okta.example.com/app/ssm/sso/saml" })
  @IsUrl({ require_tld: false })
  ssoUrl!: string;

  @ApiProperty({ example: "SHA256:DEMO-FINGERPRINT" })
  @IsString()
  @MinLength(8)
  certificateFingerprint!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class TrustDeviceDto {
  @ApiProperty({ required: false, example: "Finance reviewer laptop" })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;
}
