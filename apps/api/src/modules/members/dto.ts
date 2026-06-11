import { ApiProperty } from "@nestjs/swagger";
import { roles, type Role } from "@ssm/domain";
import { IsEmail, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

export class InviteMemberDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ example: "reviewer@acmegrowth.test" })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: roles, example: "reviewer" })
  @IsIn(roles)
  role!: Role;

  @ApiProperty({ required: false, default: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: roles, example: "manager" })
  @IsIn(roles)
  role!: Role;
}
