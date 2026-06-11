import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsISO8601, IsOptional, IsUUID } from "class-validator";

export class EnqueuePublishingJobsDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty()
  @IsUUID()
  postId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  socialAccountIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  publishAt?: string;
}
