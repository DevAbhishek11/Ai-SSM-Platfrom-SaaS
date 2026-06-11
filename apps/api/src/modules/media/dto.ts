import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateUploadIntentDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ example: "launch-hero.webp" })
  @IsString()
  fileName!: string;

  @ApiProperty({ example: "image/webp" })
  @IsString()
  fileType!: string;

  @ApiProperty({ example: 842114 })
  @IsInt()
  @Min(1)
  @Max(1024 * 1024 * 1024)
  fileSize!: number;
}

export class CompleteUploadDto {
  @ApiProperty()
  @IsUUID()
  uploadIntentId!: string;

  @ApiProperty({ example: "sha256-demo" })
  @IsString()
  checksumSha256!: string;
}

export class FailProcessingJobDto {
  @ApiProperty({ example: "Virus scanner returned an error" })
  @IsString()
  errorMessage!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  step?: string;
}
