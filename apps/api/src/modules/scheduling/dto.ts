import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  platforms,
  scheduleRuleStatuses,
  type Platform,
  type ScheduleRuleStatus
} from "@ssm/domain";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";

export class ScheduleWindowDto {
  @ApiProperty({ minimum: 0, maximum: 6, example: 2 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: "10:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @ApiProperty({ example: "12:00" })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;
}

export class CreateScheduleRuleDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ example: "Launch peak windows" })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @ApiProperty({ enum: platforms, isArray: true, example: ["linkedin", "instagram"] })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(platforms, { each: true })
  platforms!: Platform[];

  @ApiProperty({ example: "Asia/Calcutta" })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  timezone!: string;

  @ApiProperty({ type: [ScheduleWindowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleWindowDto)
  windows!: ScheduleWindowDto[];

  @ApiPropertyOptional({ default: 120 })
  @IsOptional()
  @IsInt()
  @Min(15)
  minGapMinutes?: number;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  maxPostsPerDay?: number;

  @ApiPropertyOptional({ enum: scheduleRuleStatuses, default: "active" })
  @IsOptional()
  @IsIn(scheduleRuleStatuses)
  status?: ScheduleRuleStatus;
}

export class RecommendScheduleSlotsDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiPropertyOptional({ enum: platforms, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(platforms, { each: true })
  platforms?: Platform[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  earliestAt?: string;
}

export class ReserveScheduleSlotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  postId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
