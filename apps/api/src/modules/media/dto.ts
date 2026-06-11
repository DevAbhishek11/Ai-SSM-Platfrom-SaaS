import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, IsUUID, Max, Min } from "class-validator";

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
