import { ApiProperty } from "@nestjs/swagger";
import {
  reportFormats,
  reportScheduleFrequencies,
  reportTypes,
  type ReportFormat,
  type ReportScheduleFrequency,
  type ReportType
} from "@ssm/domain";
import { IsArray, IsEmail, IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateReportTemplateDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ example: "Executive launch report" })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @ApiProperty({ enum: reportTypes, example: "executive" })
  @IsIn(reportTypes)
  type!: ReportType;

  @ApiProperty({ enum: reportFormats, example: "pdf" })
  @IsIn(reportFormats)
  format!: ReportFormat;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    footerText?: string;
  };
}

export class CreateScheduledReportDto {
  @ApiProperty()
  @IsUUID()
  templateId!: string;

  @ApiProperty({ enum: reportScheduleFrequencies, example: "weekly" })
  @IsIn(reportScheduleFrequencies)
  frequency!: ReportScheduleFrequency;

  @ApiProperty({ isArray: true, example: ["owner@acmegrowth.test"] })
  @IsArray()
  @IsEmail({}, { each: true })
  recipients!: string[];
}

export class CreateReportExportDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ enum: reportTypes, example: "executive" })
  @IsIn(reportTypes)
  type!: ReportType;

  @ApiProperty({ enum: reportFormats, example: "pdf" })
  @IsIn(reportFormats)
  format!: ReportFormat;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

export class CreateReportShareLinkDto {
  @ApiProperty({ required: false, example: "2026-06-18T05:45:00.000Z" })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
