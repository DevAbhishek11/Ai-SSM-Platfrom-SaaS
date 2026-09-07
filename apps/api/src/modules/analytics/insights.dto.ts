import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from "class-validator";
import { metricKeys } from "@ssm/domain";

const rateKeys = ["engagementRate", "clickThroughRate", "conversionRate", "reachEfficiency"];

export class InsightsQueryDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  /** Inclusive start of the reporting window (YYYY-MM-DD). Defaults to 27 days back. */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Inclusive end of the reporting window. Defaults to today. */
  @IsOptional()
  @IsISO8601()
  to?: string;

  /**
   * IANA zone used to bucket "best time to post". Required to be explicit
   * somewhere; the caller's zone is the only one that means anything to a
   * scheduling recommendation.
   */
  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsIn([...metricKeys, ...rateKeys])
  metric?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  /** Restrict the whole report to one network. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  platform?: string;
}
