import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { searchHitKinds, type SearchHitKind } from "@ssm/domain";

export class SearchQueryDto {
  @ApiPropertyOptional({ description: "Free-text query; empty returns recent items" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @ApiPropertyOptional({ enum: searchHitKinds, isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.split(",").filter(Boolean) : value
  )
  @IsArray()
  @IsIn(searchHitKinds, { each: true })
  kinds?: SearchHitKind[];

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
