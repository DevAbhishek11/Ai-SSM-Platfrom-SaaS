import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateBrandVoiceDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ example: "Acme Practical Confidence" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  tone?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  style?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  vocabulary?: {
    preferredTerms?: string[];
    bannedTerms?: string[];
    industryTerms?: string[];
  };

  @ApiPropertyOptional({ enum: ["none", "light", "moderate", "expressive"] })
  @IsOptional()
  @IsIn(["none", "light", "moderate", "expressive"])
  emojiUsage?: "none" | "light" | "moderate" | "expressive";

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  ctaPreferences?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examples?: string[];
}

export class UpdateBrandVoiceDto {
  @ApiPropertyOptional({ example: "Acme Practical Confidence" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  tone?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  style?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  vocabulary?: {
    preferredTerms?: string[];
    bannedTerms?: string[];
    industryTerms?: string[];
  };

  @ApiPropertyOptional({ enum: ["none", "light", "moderate", "expressive"] })
  @IsOptional()
  @IsIn(["none", "light", "moderate", "expressive"])
  emojiUsage?: "none" | "light" | "moderate" | "expressive";

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  ctaPreferences?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  examples?: string[];
}

export class EvaluateBrandVoiceDto {
  @ApiProperty({ example: "Launch operations finally feel calm and measurable." })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;
}
