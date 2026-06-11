import { ApiProperty } from "@nestjs/swagger";
import {
  campaignTaskPriorities,
  campaignTaskStatuses,
  type CampaignTaskPriority,
  type CampaignTaskStatus
} from "@ssm/domain";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class CreateCampaignTaskDto {
  @ApiProperty({ example: "Finalize launch thread" })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @ApiProperty({ enum: campaignTaskPriorities, required: false, example: "high" })
  @IsOptional()
  @IsIn(campaignTaskPriorities)
  priority?: CampaignTaskPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({ required: false, example: "2026-06-18" })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCampaignTaskStatusDto {
  @ApiProperty({ enum: campaignTaskStatuses, example: "done" })
  @IsIn(campaignTaskStatuses)
  status!: CampaignTaskStatus;
}

export class UpsertCampaignBudgetLineDto {
  @ApiProperty({ example: "Paid social" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  category!: string;

  @ApiProperty({ minimum: 0, example: 20000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allocated!: number;

  @ApiProperty({ minimum: 0, example: 8200 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  spent!: number;

  @ApiProperty({ required: false, example: "USD" })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class GenerateCampaignReportDto {
  @ApiProperty({ required: false, example: "2026-06-01" })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiProperty({ required: false, example: "2026-06-30" })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}
