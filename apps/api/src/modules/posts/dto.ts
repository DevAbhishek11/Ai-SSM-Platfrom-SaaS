import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;
}
