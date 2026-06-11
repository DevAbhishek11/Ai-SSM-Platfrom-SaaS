import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  contentTemplateCategories,
  contentTemplateStatuses,
  platforms,
  postStatuses,
  type ContentTemplateCategory,
  type ContentTemplateStatus,
  type Platform,
  type PostStatus
} from "@ssm/domain";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from "class-validator";

export class CreateContentTemplateDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ example: "Launch proof point post" })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @ApiProperty({ enum: contentTemplateCategories, example: "product_launch" })
  @IsIn(contentTemplateCategories)
  category!: ContentTemplateCategory;

  @ApiPropertyOptional({ enum: contentTemplateStatuses, default: "active" })
  @IsOptional()
  @IsIn(contentTemplateStatuses)
  status?: ContentTemplateStatus;

  @ApiProperty({ enum: platforms, isArray: true, example: ["linkedin", "instagram"] })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(platforms, { each: true })
  platforms!: Platform[];

  @ApiProperty({ example: "{{product}} helps {{audience}} with {{proofPoint}}." })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  bodyTemplate!: string;

  @ApiPropertyOptional({ type: [String], example: ["product", "audience", "proofPoint"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ type: [String], example: ["LaunchOps", "SocialMedia"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultHashtags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  guidance?: Record<string, unknown>;
}

export class UseContentTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ example: { product: "Acme Planner", audience: "launch teams" } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional({ enum: postStatuses, default: "draft" })
  @IsOptional()
  @IsIn(postStatuses)
  status?: PostStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
