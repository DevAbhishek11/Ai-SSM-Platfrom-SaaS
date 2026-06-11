import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateApiKeyDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ example: "Publishing worker" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: ["posts.publish", "posts.view"] })
  @IsArray()
  @IsString({ each: true })
  scopes!: string[];

  @ApiProperty({ required: false, example: "2026-09-11T05:45:00.000Z" })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
