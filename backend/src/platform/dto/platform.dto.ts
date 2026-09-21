import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from "class-validator";
import { PACKAGE_GATED_KEYS } from "@wufud/contracts";
import type { TenantStatus } from "../../tenancy/entities/tenant.entity";

const FEATURE_KEYS = [...PACKAGE_GATED_KEYS] as string[];

export class CreateTenantDto {
  @ApiProperty({ example: "Nur Travels", description: "Display name of the agency." })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "nur-travels", description: "URL slug; becomes subdomain and schema suffix." })
  @IsString()
  @MinLength(2)
  slug!: string;

  @ApiPropertyOptional({ example: "owner@agency.local", description: "Receives tenant owner invitation email." })
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @ApiPropertyOptional({ example: "starter", description: "Plan slug applied at provision time (optional)." })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ example: 14, description: "Override plan trial length in days. 0 skips trial and activates immediately." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiPropertyOptional({ example: 168, description: "Owner invitation expiry in hours." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  invitationExpiresHours?: number;
}

export class SetTenantStatusDto {
  @ApiProperty({ enum: ["active", "trial", "suspended", "cancelled"], example: "active" })
  @IsIn(["active", "trial", "suspended", "cancelled"])
  status!: TenantStatus;
}

export class SetTenantFeatureDto {
  @ApiProperty({
    example: "reports",
    enum: FEATURE_KEYS,
    description: "Package-gated tenant module key from the feature registry.",
  })
  @IsString()
  @IsIn(FEATURE_KEYS)
  featureKey!: string;

  @ApiProperty({ example: true, description: "When false, the module is disabled for this tenant via override." })
  @IsBoolean()
  enabled!: boolean;
}

export class BulkTenantFeaturesDto {
  @ApiProperty({
    example: { dashboard: true, packages: true, bookings: true, reports: false },
    description: "Desired enabled state per feature key. Keys not sent are left unchanged.",
  })
  @IsObject()
  features!: Record<string, boolean>;
}

export class SubscribeTenantDto {
  @ApiProperty({
    example: "01a0c07f-46fa-773f-abf9-24c46dfc57bd",
    description: "Plan UUID from GET /api/v1/platform/plans.",
  })
  @IsUUID()
  planId!: string;
}

export class UpsertPlanDto {
  @ApiPropertyOptional({ description: "Include when updating an existing plan." })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: "Growth" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "growth" })
  @IsString()
  @MinLength(2)
  slug!: string;

  @ApiPropertyOptional({ example: "Five branches, accounts, and reports." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: "12900" })
  @IsString()
  priceMonthly!: string;

  @ApiPropertyOptional({ example: "BDT" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    example: ["dashboard", "packages", "bookings", "payments", "reports"],
    enum: FEATURE_KEYS,
    isArray: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsIn(FEATURE_KEYS, { each: true })
  features!: string[];

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxUsers!: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxBranches!: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ example: 14, description: "Self-serve trial length. 0 disables trial for this plan." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiPropertyOptional({ example: 168, description: "Default invitation expiry in hours for this plan." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  invitationExpiresHours?: number;
}

export class AddPlatformDomainDto {
  @ApiProperty({ example: "wufud.example.com" })
  @IsString()
  @MinLength(3)
  host!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
