import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  complianceRegulations,
  dataResidencyRegions,
  dateFormatOptions,
  localeDirections,
  supportedLocales,
  timeFormatOptions,
  type ComplianceRegulation,
  type DataResidencyRegion,
  type DateFormatOption,
  type LocaleDirection,
  type SupportedLocale,
  type TimeFormatOption
} from "@ssm/domain";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class UpdateLocalizationPreferenceDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: supportedLocales })
  @IsOptional()
  @IsIn(supportedLocales)
  locale?: SupportedLocale;

  @ApiPropertyOptional({ enum: localeDirections })
  @IsOptional()
  @IsIn(localeDirections)
  direction?: LocaleDirection;

  @ApiPropertyOptional({ example: "Asia/Calcutta" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({ enum: dateFormatOptions })
  @IsOptional()
  @IsIn(dateFormatOptions)
  dateFormat?: DateFormatOption;

  @ApiPropertyOptional({ enum: timeFormatOptions })
  @IsOptional()
  @IsIn(timeFormatOptions)
  timeFormat?: TimeFormatOption;

  @ApiPropertyOptional({ minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  firstDayOfWeek?: number;

  @ApiPropertyOptional({ example: "latn" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  numberingSystem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  contentTranslationEnabled?: boolean;
}

export class UpdateRegionalComplianceProfileDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiPropertyOptional({ enum: dataResidencyRegions })
  @IsOptional()
  @IsIn(dataResidencyRegions)
  dataResidency?: DataResidencyRegion;

  @ApiPropertyOptional({ example: "eu-central-1" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  primaryRegion?: string;

  @ApiPropertyOptional({ enum: complianceRegulations, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(complianceRegulations, { each: true })
  regulations?: ComplianceRegulation[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  consentRequired?: boolean;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  retentionDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  crossBorderTransfer?: boolean;
}
