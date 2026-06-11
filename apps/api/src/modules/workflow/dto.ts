import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

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
