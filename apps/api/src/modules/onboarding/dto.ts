import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CompleteOnboardingStepDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SkipOnboardingStepDto {
  @ApiPropertyOptional({ example: "Handled outside the platform for this workspace." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
