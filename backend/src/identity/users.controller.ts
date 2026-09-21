import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { EntityManager } from "@mikro-orm/postgresql";
import { User } from "./entities/user.entity";
import { RequireFeature } from "../access/require-feature.guard";
import { ListQueryDto } from "../shared/dto/list-query.dto";
import { paginate } from "../shared/pagination/cursor.paginator";
import { listSuccessResponse, successResponse } from "../shared/interceptors/success.interceptor";
import { serializeUser } from "./serialize-user";
import { getTenantStore } from "../tenancy/tenant-context";
import { AuthService } from "./auth.service";
import { CurrentUser } from "../shared/decorators/current-user.decorator";
import { ERR_FORBIDDEN, ERR_UNAUTH } from "../shared/swagger/api-examples";
import { ApiErrorEnvelopeDto } from "../shared/swagger/envelope.dto";

@ApiTags("Users")
@ApiBearerAuth("access-token")
@Controller("api/v1/users")
export class UsersController {
  constructor(
    private readonly em: EntityManager,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @RequireFeature("users", "view")
  @ApiOperation({
    summary: "List tenant users",
    description: "Cursor-paginated users of the current tenant. Supports `search`, `page_size`, `cursor`.",
  })
  @ApiQuery({ name: "search", required: false, example: "demo" })
  @ApiQuery({ name: "page_size", required: false, example: 10 })
  @ApiQuery({ name: "cursor", required: false, example: "eyJpZCI6IjAxY..." })
  @ApiResponse({
    status: 200,
    description: "User list envelope.",
    schema: {
      example: {
        success: true,
        message: "Resources retrieved successfully.",
        data: {
          items: [{ id: "01a0c07f-475a-75b9-8c75-4efff3d7dc6e", email: "pilgrim@demo.local", full_name: "Demo Pilgrim" }],
          pagination: { has_next: false, has_previous: false, page_size: 10 },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Missing/expired JWT.", schema: { example: ERR_UNAUTH } })
  @ApiResponse({ status: 403, description: "No users:view permission.", schema: { example: ERR_FORBIDDEN } })
  async list(@Query() query: ListQueryDto) {
    const tenant = getTenantStore()?.tenant;
    const where: Record<string, unknown> = {};
    if (tenant) where.tenant = tenant.id;
    if (query.search) where.fullName = { $ilike: `%${query.search}%` };
    const page = await paginate(this.em, User, where, { cursor: query.cursor, pageSize: query.page_size });
    return listSuccessResponse(page.items.map(serializeUser), page.pagination);
  }

  @Post("invite")
  @RequireFeature("users", "edit")
  @ApiOperation({
    summary: "Invite employee",
    description: "Creates an employee invitation for the current tenant. Share the returned token with the new member.",
  })
  @ApiBody({
    schema: {
      example: { email: "agent@demo.local", fullName: "Booking Agent", roleSlug: "agent", branchId: "01a0c07f-1111-0000-0000-000000000001" },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Invitation created.",
    schema: {
      example: {
        success: true,
        message: "Invitation created. Share the token with the new member.",
        data: { invitation_token: "9f2c4a...invite-token" },
      },
    },
  })
  @ApiResponse({ status: 401, schema: { example: ERR_UNAUTH } })
  @ApiResponse({ status: 403, schema: { example: ERR_FORBIDDEN } })
  @ApiResponse({ status: 400, type: ApiErrorEnvelopeDto, description: "Validation error." })
  async invite(
    @Body() body: { email: string; fullName?: string; roleSlug?: string; branchId?: string },
    @CurrentUser() actor: User,
  ) {
    const tenant = getTenantStore()?.tenant;
    const { token, emailSent } = await this.auth.invite({
      email: body.email,
      fullName: body.fullName,
      type: "employee",
      tenantId: tenant?.id,
      invitedById: actor.id,
      metadata: { roleSlug: body.roleSlug, branchId: body.branchId },
      plane: "tenant",
    });
    return successResponse(
      { invitation_token: token, email_sent: emailSent },
      emailSent ? "Invitation sent." : "Invitation created. Configure a default mailbox to email invites automatically.",
    );
  }
}
