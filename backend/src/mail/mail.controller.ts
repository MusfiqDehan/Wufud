import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { MailService } from "./mail.service";
import { RequireFeature } from "../access/require-feature.guard";
import { listSuccessResponse, successResponse } from "../shared/interceptors/success.interceptor";
import { CurrentUser } from "../shared/decorators/current-user.decorator";
import { User } from "../identity/entities/user.entity";
import { ErrorCode } from "@wufud/contracts";
import { DomainError } from "../shared/errors/domain.error";
import type { EmailWriteBody } from "./mail.mapper";

const ACCOUNT_EXAMPLE = {
  id: "01a0c0aa-1111-7000-8000-000000000001",
  label: "Gmail SMTP",
  host: "smtp.gmail.com",
  port: 465,
  username: "ops@example.com",
  from_address: "ops@example.com",
  use_ssl: true,
  is_default: true,
  has_password: true,
};

@ApiTags("Mail")
@ApiBearerAuth("access-token")
@Controller("api/v1")
export class MailController {
  constructor(private readonly mail: MailService) {}

  @Get("platform/email-accounts")
  @RequireFeature("platform.email", "view")
  @ApiOperation({ summary: "Platform email accounts", description: "SMTP mailboxes used for platform invitations and notices. Passwords are never returned." })
  @ApiResponse({ status: 200, schema: { example: { success: true, data: { items: [ACCOUNT_EXAMPLE] } } } })
  async listPlatform() {
    return listSuccessResponse(await this.mail.listPlatform());
  }

  @Post("platform/email-accounts")
  @RequireFeature("platform.email", "edit")
  @ApiOperation({ summary: "Create or update a platform email account" })
  @ApiBody({ schema: { example: { label: "Gmail SMTP", host: "smtp.gmail.com", port: 465, username: "ops@example.com", password: "***", fromAddress: "ops@example.com", useSsl: true, isDefault: true } } })
  async savePlatform(@Body() body: EmailWriteBody) {
    return successResponse(await this.mail.savePlatform(body), "Email account saved.");
  }

  @Patch("platform/email-accounts/:id")
  @RequireFeature("platform.email", "edit")
  @ApiParam({ name: "id", format: "uuid" })
  async updatePlatform(@Param("id") id: string, @Body() body: EmailWriteBody) {
    return successResponse(await this.mail.savePlatform({ ...body, id }), "Email account saved.");
  }

  @Delete("platform/email-accounts/:id")
  @RequireFeature("platform.email", "edit")
  @ApiParam({ name: "id", format: "uuid" })
  async deletePlatform(@Param("id") id: string) {
    return listSuccessResponse(await this.mail.deletePlatform(id), undefined, "Email account removed.");
  }

  @Post("platform/email-accounts/:id/default")
  @RequireFeature("platform.email", "edit")
  @ApiOperation({ summary: "Set default platform mailbox", description: "Exactly one mailbox can be default. A sole remaining account is always default." })
  async defaultPlatform(@Param("id") id: string) {
    return successResponse(await this.mail.setDefaultPlatform(id), "Default mailbox updated.");
  }

  @Post("platform/email-accounts/:id/test")
  @RequireFeature("platform.email", "edit")
  async testPlatform(@Param("id") id: string, @Body() body: { to?: string }, @CurrentUser() user: User) {
    const to = body.to || user.email;
    if (!to) {
      throw new DomainError(ErrorCode.VALIDATION_ERROR, undefined, 400, {
        to: ["Enter an email address for the test message."],
      });
    }
    return successResponse(await this.mail.sendTest("platform", id, to), "Test message sent.");
  }

  @Get("email-accounts")
  @RequireFeature("email", "view")
  @ApiOperation({ summary: "Tenant email accounts" })
  async listTenant() {
    return listSuccessResponse(await this.mail.listTenant());
  }

  @Post("email-accounts")
  @RequireFeature("email", "edit")
  async saveTenant(@Body() body: EmailWriteBody) {
    return successResponse(await this.mail.saveTenant(body), "Email account saved.");
  }

  @Patch("email-accounts/:id")
  @RequireFeature("email", "edit")
  async updateTenant(@Param("id") id: string, @Body() body: EmailWriteBody) {
    return successResponse(await this.mail.saveTenant({ ...body, id }), "Email account saved.");
  }

  @Delete("email-accounts/:id")
  @RequireFeature("email", "edit")
  async deleteTenant(@Param("id") id: string) {
    return listSuccessResponse(await this.mail.deleteTenant(id), undefined, "Email account removed.");
  }

  @Post("email-accounts/:id/default")
  @RequireFeature("email", "edit")
  async defaultTenant(@Param("id") id: string) {
    return successResponse(await this.mail.setDefaultTenant(id), "Default mailbox updated.");
  }

  @Post("email-accounts/:id/test")
  @RequireFeature("email", "edit")
  async testTenant(@Param("id") id: string, @Body() body: { to?: string }, @CurrentUser() user: User) {
    const to = body.to || user.email;
    if (!to) {
      throw new DomainError(ErrorCode.VALIDATION_ERROR, undefined, 400, {
        to: ["Enter an email address for the test message."],
      });
    }
    return successResponse(await this.mail.sendTest("tenant", id, to), "Test message sent.");
  }
}
