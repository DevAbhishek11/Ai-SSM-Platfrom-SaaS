import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMinSize, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { platforms, type Platform } from "@ssm/domain";

export class GenerateContentDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ minLength: 10, maxLength: 5000 })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  brief!: string;

  @ApiProperty({ enum: platforms, isArray: true })
  @ArrayMinSize(1)
  @IsIn(platforms, { each: true })
  platforms!: Platform[];

  @ApiPropertyOptional({ default: "professional" })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional({ default: "engagement" })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandVoiceId?: string;
}
