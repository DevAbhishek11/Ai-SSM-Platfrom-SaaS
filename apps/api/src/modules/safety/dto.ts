import { ApiProperty } from "@nestjs/swagger";
import { moderationStatuses, type ModerationStatus } from "@ssm/domain";
import { IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateSafetyPolicyDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ example: "Default AI publishing guardrails" })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  rules?: {
    blockedTerms?: string[];
    requiredDisclosures?: string[];
    industry?: string;
    maxRiskScore?: number;
  };
}

export class EvaluateContentSafetyDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ example: "Our launch workflow guarantees risk-free returns." })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  text!: string;

  @ApiProperty({ required: false, enum: ["ai_generation", "manual", "post_review"] })
  @IsOptional()
  @IsIn(["ai_generation", "manual", "post_review"])
  source?: "ai_generation" | "manual" | "post_review";

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  sourceEntityId?: string;
}

export class ResolveModerationItemDto {
  @ApiProperty({ enum: moderationStatuses, example: "approved" })
  @IsIn(moderationStatuses)
  status!: ModerationStatus;

  @ApiProperty({ required: false, example: "Reviewed and rewritten with approved disclosure." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
