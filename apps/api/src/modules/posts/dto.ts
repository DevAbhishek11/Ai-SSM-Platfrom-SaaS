import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";
import { platforms, postStatuses, type Platform, type PostStatus } from "@ssm/domain";

export class PostContentVariantDto {
  @ApiProperty({ enum: platforms })
  @IsIn(platforms)
  platform!: Platform;

  @ApiProperty({ maxLength: 65000 })
  @IsString()
  @MaxLength(65000)
  text!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstComment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;
}

export class CreatePostDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiProperty({ type: [PostContentVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PostContentVariantDto)
  content!: PostContentVariantDto[];

  @ApiPropertyOptional({ enum: postStatuses, default: "draft" })
  @IsOptional()
  @IsIn(postStatuses)
  status?: PostStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  mediaIds?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;
}

/**
 * Partial update. Every field is optional, but an empty body is rejected by the
 * service so a no-op cannot silently bump `updatedAt` and win a lost-update
 * race against a real edit.
 */
export class UpdatePostDto {
  @ApiPropertyOptional({ type: [PostContentVariantDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PostContentVariantDto)
  content?: PostContentVariantDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  mediaIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandVoiceId?: string;

  /**
   * Optimistic concurrency token: the `updatedAt` the client last read. When
   * supplied and stale, the write is rejected with a 409 instead of silently
   * overwriting a colleague's edit.
   */
  @ApiPropertyOptional({ description: "The updatedAt value the edit was based on" })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}

/** Preflight body for `POST /posts/validate`; never persisted. */
export class ValidatePostDto {
  @ApiProperty({ type: [PostContentVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostContentVariantDto)
  content!: PostContentVariantDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  mediaCount?: number;
}

export const postSortFields = ["scheduledAt", "createdAt", "updatedAt", "status"] as const;
export type PostSortField = (typeof postSortFields)[number];

export class ListPostsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @ApiPropertyOptional({ enum: postStatuses, isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.split(",").filter(Boolean) : value
  )
  @IsArray()
  @IsIn(postStatuses, { each: true })
  status?: PostStatus[];

  @ApiPropertyOptional({ enum: platforms, isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.split(",").filter(Boolean) : value
  )
  @IsArray()
  @IsIn(platforms, { each: true })
  platform?: Platform[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: "Free-text match across post copy" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: "Only posts scheduled at or after this instant" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: "Only posts scheduled at or before this instant" })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: postSortFields, default: "scheduledAt" })
  @IsOptional()
  @IsIn(postSortFields)
  sort?: PostSortField;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "asc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  direction?: "asc" | "desc";

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
