import { ApiProperty } from "@nestjs/swagger";
import {
  notificationDigestFrequencies,
  notificationTypes,
  type NotificationDigestFrequency,
  type NotificationType
} from "@ssm/domain";
import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, IsUUID, Matches } from "class-validator";

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  channelSettings?: Record<string, boolean>;

  @ApiProperty({ enum: notificationDigestFrequencies, required: false })
  @IsOptional()
  @IsIn(notificationDigestFrequencies)
  digestFrequency?: NotificationDigestFrequency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };

  @ApiProperty({ enum: notificationTypes, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsIn(notificationTypes, { each: true })
  mutedTypes?: NotificationType[];
}

export class RouteNotificationDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: notificationTypes })
  @IsIn(notificationTypes)
  type!: NotificationType;

  @ApiProperty({ example: "Publishing failed" })
  @IsString()
  title!: string;

  @ApiProperty({ example: "Instagram returned a retryable error." })
  @IsString()
  body!: string;

  @ApiProperty({ required: false, example: "high" })
  @IsOptional()
  @IsIn(["low", "normal", "high", "critical"])
  priority?: "low" | "normal" | "high" | "critical";

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class QuietHoursDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ example: "22:00" })
  @Matches(/^\d{2}:\d{2}$/)
  start!: string;

  @ApiProperty({ example: "07:00" })
  @Matches(/^\d{2}:\d{2}$/)
  end!: string;

  @ApiProperty({ example: "Asia/Calcutta" })
  @IsString()
  timezone!: string;
}
