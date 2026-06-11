import { ApiProperty } from "@nestjs/swagger";
import {
  listeningMonitorTypes,
  platforms,
  sentimentLabels,
  type ListeningMonitorType,
  type Platform,
  type SentimentLabel
} from "@ssm/domain";
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class CreateListeningMonitorDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ enum: listeningMonitorTypes, example: "brand" })
  @IsIn(listeningMonitorTypes)
  type!: ListeningMonitorType;

  @ApiProperty({ example: "Acme Growth" })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  query!: string;

  @ApiProperty({ enum: platforms, isArray: true, required: false, example: ["x", "linkedin"] })
  @IsOptional()
  @IsArray()
  @IsIn(platforms, { each: true })
  platforms?: Platform[];

  @ApiProperty({ required: false, minimum: 0, maximum: 100, example: 72 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  alertThreshold?: number;
}

export class IngestSocialMentionDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty()
  @IsUUID()
  monitorId!: string;

  @ApiProperty({ enum: platforms, example: "x" })
  @IsIn(platforms)
  platform!: Platform;

  @ApiProperty({ example: "LaunchOps Watch" })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  author!: string;

  @ApiProperty({ example: "Acme Growth account connection seems broken before launch day." })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  @ApiProperty({ required: false, example: "https://social.example.com/x/mentions/5353" })
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiProperty({ enum: sentimentLabels, example: "negative" })
  @IsIn(sentimentLabels)
  sentiment!: SentimentLabel;

  @ApiProperty({ minimum: 0, example: 91000 })
  @IsInt()
  @Min(0)
  reach!: number;

  @ApiProperty({ minimum: 0, example: 2100 })
  @IsInt()
  @Min(0)
  engagement!: number;

  @ApiProperty({ required: false, example: { source: "webhook", crisisSignal: true } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
