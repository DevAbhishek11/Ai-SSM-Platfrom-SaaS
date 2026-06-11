import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "owner@acmegrowth.test" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: "demo-password-change-me" })
  @IsString()
  @MinLength(8)
  password!: string;
}
