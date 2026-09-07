import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from "class-validator";

export class WorkflowCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  comment!: string;
}

export class SchedulePostDto {
  @ApiProperty()
  @IsISO8601()
  scheduledAt!: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;
}

export const bulkWorkflowActions = [
  "submit",
  "approve",
  "request_changes",
  "cancel",
  "archive"
] as const;
export type BulkWorkflowAction = (typeof bulkWorkflowActions)[number];

/**
 * Applies one workflow action to many posts.
 *
 * The batch is deliberately capped: an unbounded list turns a single request
 * into an unbounded amount of work, and 50 is far past any realistic selection.
 */
export class BulkWorkflowDto {
  @ApiProperty({ type: [String], maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID("4", { each: true })
  postIds!: string[];

  @ApiProperty({ enum: bulkWorkflowActions })
  @IsIn(bulkWorkflowActions)
  action!: BulkWorkflowAction;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comment?: string;
}

export class AddPostCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
