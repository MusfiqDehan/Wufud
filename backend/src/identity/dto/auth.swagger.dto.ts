import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class LoginBodyDto {
  @ApiProperty({ example: "admin@wufud.local" })
  @IsEmail({}, { message: "Enter a valid email address." })
  email!: string;

  @ApiProperty({ example: "WufudDemo!2026", minLength: 6 })
  @IsString()
  @MinLength(1, { message: "Enter your password." })
  password!: string;
}

export class RegisterBodyDto extends LoginBodyDto {
  @ApiProperty({ example: "Agency Owner" })
  @IsString()
  @MinLength(2, { message: "Enter your full name." })
  fullName!: string;

  @ApiPropertyOptional({ example: "My Hajj Agency", description: "When set on the platform host, provisions a new tenant." })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Enter your agency name." })
  agencyName?: string;

  @IsString()
  @MinLength(8, { message: "Use at least 8 characters for your password." })
  declare password: string;
}

export class StorefrontBodyDto extends LoginBodyDto {
  @ApiPropertyOptional({ example: "Demo Pilgrim" })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Enter your full name." })
  fullName?: string;

  @IsString()
  @MinLength(8, { message: "Use at least 8 characters for your password." })
  declare password: string;
}

export const AUTH_LOGIN_EXAMPLE = {
  success: true,
  message: "You're signed in.",
  data: {
    access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    user: { id: "01a0c07f-4757-70ab-b126-e0461b91bcc3", email: "admin@wufud.local", full_name: "Platform Admin" },
  },
};
