import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../shared/decorators/public.decorator";
import { listSuccessResponse, successResponse } from "../shared/interceptors/success.interceptor";
import { OnboardingService } from "./onboarding.service";
import { getTenantStore } from "../tenancy/tenant-context";

class StartAgencyDto {
  @ApiProperty({ example: "Nur Travels" })
  @IsString()
  @MinLength(2, { message: "Enter your agency name." })
  agencyName!: string;

  @ApiProperty({ example: "nur-travels" })
  @IsString()
  @MinLength(3, { message: "Choose a subdomain with at least 3 characters." })
  slug!: string;

  @ApiProperty({ example: "Nadia Rahman" })
  @IsString()
  @MinLength(2, { message: "Enter your full name." })
  fullName!: string;

  @ApiProperty({ example: "owner@agency.local" })
  @IsEmail({}, { message: "Enter a valid email address." })
  email!: string;

  @ApiProperty({ example: "WufudDemo!2026" })
  @IsString()
  @MinLength(8, { message: "Use at least 8 characters for your password." })
  password!: string;

  @ApiProperty({ example: "01a0c07f-46fa-773f-abf9-24c46dfc57bd" })
  @IsUUID(undefined, { message: "Choose a valid plan." })
  planId!: string;

  @ApiProperty({ enum: ["trial", "paid"], example: "trial" })
  @IsIn(["trial", "paid"], { message: "Choose trial or paid billing." })
  mode!: "trial" | "paid";

  @ApiPropertyOptional({ example: "stub" })
  @IsOptional()
  @IsString()
  gatewaySlug?: string;
}

@ApiTags("Public")
@Controller("api/v1/public")
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Public()
  @Get("plans")
  @ApiOperation({ summary: "Published billing plans", description: "Plans available for self-serve agency signup." })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: "Resources retrieved successfully.",
        data: { items: [{ slug: "growth", name: "Growth", priceMonthly: "12900", trialDays: 14 }] },
      },
    },
  })
  async plans() {
    return listSuccessResponse(await this.onboarding.listPublishedPlans());
  }

  @Public()
  @Get("onboard/slug")
  @ApiOperation({ summary: "Check subdomain availability" })
  @ApiQuery({ name: "slug", required: true, example: "nur-travels" })
  async slug(@Query("slug") slug = "") {
    return successResponse(await this.onboarding.slugStatus(slug));
  }

  @Public()
  @Get("billing-gateways")
  @ApiOperation({
    summary: "Platform billing gateways",
    description: "Gateways the platform can charge with its own credentials (subscription checkout).",
  })
  async billingGateways() {
    return listSuccessResponse(await this.onboarding.billingGateways());
  }

  @Public()
  @Post("onboard")
  @ApiOperation({
    summary: "Self-serve agency signup",
    description:
      "Trial reserves the subdomain and sends a verification email — no tenant until verified. " +
      "Paid reserves the subdomain and returns `gateway_url`; provisioning runs after payment success.",
  })
  @ApiBody({ type: StartAgencyDto })
  async start(@Body() body: StartAgencyDto, @Req() req: Request) {
    const forwarded = req.headers["x-forwarded-host"] ?? req.headers.host ?? getTenantStore()?.host ?? "localhost";
    const host = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const result = await this.onboarding.start(body, host);
    const message =
      result.status === "pending_verification"
        ? "Check your email to verify and create your workspace."
        : result.status === "pending_payment"
          ? "Payment initiated."
          : "Agency created.";
    return successResponse(result, message);
  }

  @Public()
  @Post("onboard/verify")
  @ApiOperation({ summary: "Confirm trial signup email and provision agency" })
  @ApiBody({ schema: { properties: { token: { type: "string" } }, required: ["token"] } })
  async verify(@Body("token") token: string) {
    const result = await this.onboarding.confirmVerification(token);
    return successResponse(result, "Agency created.");
  }
}
