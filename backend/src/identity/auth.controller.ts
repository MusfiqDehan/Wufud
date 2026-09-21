import { Body, Controller, Post, Res } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { IsOptional, IsString, MinLength } from "class-validator";
import { Public } from "../shared/decorators/public.decorator";
import { SUCCESS_MESSAGES } from "@wufud/contracts";
import { successResponse } from "../shared/interceptors/success.interceptor";
import { ApiErrorEnvelopeDto } from "../shared/swagger/envelope.dto";
import { AuthService } from "./auth.service";
import { AUTH_LOGIN_EXAMPLE, LoginBodyDto, RegisterBodyDto, StorefrontBodyDto } from "./dto/auth.swagger.dto";
import { serializeUser } from "./serialize-user";

class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

class AcceptInviteDto {
  @IsString()
  @MinLength(1, { message: "This invitation link is not valid. Ask your admin for a new one." })
  token!: string;

  @IsString()
  @MinLength(8, { message: "Use at least 8 characters for your password." })
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Enter your full name." })
  fullName?: string;
}

@ApiTags("Auth")
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @ApiOperation({
    summary: "Sign in with email + password",
    description: "Validates credentials on the resolved tenant/host, returns a JWT access token and sets an httpOnly refresh cookie.",
  })
  @ApiBody({
    type: LoginBodyDto,
    examples: {
      platformAdmin: {
        summary: "Platform admin",
        value: { email: "admin@wufud.local", password: "WufudDemo!2026" },
      },
      pilgrim: {
        summary: "Tenant pilgrim",
        value: { email: "pilgrim@demo.local", password: "WufudDemo!2026" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Access token + user.", schema: { example: AUTH_LOGIN_EXAMPLE } })
  @ApiResponse({ status: 401, description: "Invalid credentials.", type: ApiErrorEnvelopeDto })
  async login(@Body() body: LoginBodyDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(body.email, body.password);
    this.setRefresh(res, result.refreshToken);
    return successResponse(
      { access_token: result.accessToken, user: serializeUser(result.user) },
      SUCCESS_MESSAGES.SIGNED_IN,
    );
  }

  @Public()
  @Post("register")
  @ApiOperation({
    summary: "Register a user",
    description:
      "Creates a user on the current host. On the platform host with `agencyName`, provisions a new tenant; " +
      "on a tenant host, creates a pilgrim account.",
  })
  @ApiBody({
    type: RegisterBodyDto,
    examples: {
      pilgrim: {
        summary: "Pilgrim on tenant host",
        value: { email: "guest@demo.local", password: "WufudDemo!2026", fullName: "Guest Booker" },
      },
      agency: {
        summary: "New agency on platform host",
        value: { email: "owner@agency.local", password: "WufudDemo!2026", fullName: "Agency Owner", agencyName: "My Hajj Agency" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Account created.", schema: { example: AUTH_LOGIN_EXAMPLE } })
  @ApiResponse({ status: 409, description: "Email already in use.", type: ApiErrorEnvelopeDto })
  async register(@Body() body: RegisterBodyDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(body);
    this.setRefresh(res, result.refreshToken);
    return successResponse(
      { access_token: result.accessToken, user: serializeUser(result.user) },
      SUCCESS_MESSAGES.REGISTERED,
    );
  }

  @Public()
  @Post("refresh")
  @ApiOperation({
    summary: "Refresh access token",
    description: "Reads the `wufud_refresh` cookie (or `refreshToken` body field) and issues a new access token.",
  })
  @ApiBody({
    schema: { example: { refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." } },
  })
  @ApiResponse({
    status: 200,
    description: "New access token.",
    schema: {
      example: { success: true, message: "Session refreshed.", data: { access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." } },
    },
  })
  async refresh(@Body() body: RefreshDto, @Res({ passthrough: true }) res: Response) {
    const cookie = (res.req as { cookies?: { wufud_refresh?: string } }).cookies?.wufud_refresh;
    const token = body.refreshToken ?? cookie;
    if (!token) {
      return successResponse(null, "Missing refresh token.");
    }
    const result = await this.auth.refresh(token);
    this.setRefresh(res, result.refreshToken);
    return successResponse({ access_token: result.accessToken }, SUCCESS_MESSAGES.SESSION_REFRESHED);
  }

  @Public()
  @Post("logout")
  @ApiOperation({ summary: "Sign out", description: "Clears the refresh cookie. Client should also drop the access token." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Signed out.", data: { ok: true } } },
  })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("wufud_refresh");
    return successResponse({ ok: true }, SUCCESS_MESSAGES.SIGNED_OUT);
  }

  @Public()
  @Post("storefront")
  @ApiOperation({
    summary: "Tenant storefront session",
    description:
      "Login-or-register for pilgrims on a tenant host. Existing email signs in; new email registers a pilgrim " +
      "and returns a token so `POST /api/v1/bookings` succeeds.",
  })
  @ApiBody({
    type: StorefrontBodyDto,
    examples: {
      booking: {
        summary: "Book-and-pay checkout",
        value: { email: "guest@demo.local", password: "WufudDemo!2026", fullName: "Demo One" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Pilgrim session.", schema: { example: AUTH_LOGIN_EXAMPLE } })
  async storefront(@Body() body: StorefrontBodyDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.storefrontSession(body);
    this.setRefresh(res, result.refreshToken);
    return successResponse(
      { access_token: result.accessToken, user: serializeUser(result.user) },
      SUCCESS_MESSAGES.SIGNED_IN,
    );
  }

  @Public()
  @Post("accept-invite")
  @ApiOperation({ summary: "Accept invitation", description: "Redeems an invite token (tenant owner / employee) and sets a password." })
  @ApiBody({
    schema: { example: { token: "9f2c...invite-token", password: "WufudDemo!2026", fullName: "New Member" } },
  })
  @ApiResponse({ status: 200, description: "Invitation accepted.", schema: { example: AUTH_LOGIN_EXAMPLE } })
  @ApiResponse({ status: 404, description: "Invitation invalid or expired.", type: ApiErrorEnvelopeDto })
  async accept(@Body() body: AcceptInviteDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.acceptInvite(body.token, body.password, body.fullName);
    this.setRefresh(res, result.refreshToken);
    return successResponse({ access_token: result.accessToken, user: serializeUser(result.user) }, SUCCESS_MESSAGES.INVITE_ACCEPTED);
  }

  private setRefresh(res: Response, token: string) {
    res.cookie("wufud_refresh", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 14 * 86400000,
    });
  }
}
