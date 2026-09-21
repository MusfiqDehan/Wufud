import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { EntityManager } from "@mikro-orm/postgresql";
import { CurrentUser } from "../shared/decorators/current-user.decorator";
import { User } from "../identity/entities/user.entity";
import { RbacService } from "./rbac.service";
import { RequireFeature } from "./require-feature.guard";
import { successResponse, listSuccessResponse } from "../shared/interceptors/success.interceptor";
import { Branch } from "./entities/branch.entity";
import { Role } from "./entities/role.entity";
import { RolePermission } from "./entities/role-permission.entity";
import { DomainError } from "../shared/errors/domain.error";
import { ListQueryDto } from "../shared/dto/list-query.dto";
import { paginate } from "../shared/pagination/cursor.paginator";
import { CrudService } from "../shared/crud/crud.service";
import { ERR_FORBIDDEN, ERR_NOT_FOUND, ERR_UNAUTH } from "../shared/swagger/api-examples";

class BranchService extends CrudService<Branch> {
  protected searchFields = ["name", "code"];
}

const EX_ME = {
  success: true,
  message: "Access retrieved successfully.",
  data: {
    user_id: "01a0c07f-475a-75b9-8c75-4efff3d7dc6e",
    email: "owner@demo.local",
    role_slugs: ["admin"],
    is_tenant_admin: true,
    is_platform_admin: false,
    enabled_features: ["dashboard", "packages", "bookings"],
  },
};

const EX_BRANCH = {
  success: true,
  message: "Branch created successfully.",
  data: { id: "01a0c07f-1111-0000-0000-000000000001", name: "Chittagong", code: "CTG", city: "Chittagong" },
};

@ApiTags("Access")
@ApiBearerAuth("access-token")
@Controller("api/v1")
export class AccessController {
  private readonly branches: BranchService;

  constructor(
    private readonly em: EntityManager,
    private readonly rbac: RbacService,
  ) {
    this.branches = new BranchService(em, Branch);
  }

  @Get("access/me")
  @ApiOperation({
    summary: "My access profile",
    description: "Returns roles, admin flags, permission map, and enabled package features for gating the UI.",
  })
  @ApiResponse({ status: 200, description: "Access envelope.", schema: { example: EX_ME } })
  @ApiResponse({ status: 401, schema: { example: ERR_UNAUTH } })
  async me(@CurrentUser() user: User) {
    return successResponse(await this.rbac.me(user), "Access retrieved successfully.");
  }

  @Get("branches")
  @RequireFeature("branches", "view")
  @ApiOperation({ summary: "List branches", description: "Cursor-paginated agency branches. Filter with `search`." })
  @ApiQuery({ name: "search", required: false, example: "CTG" })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: "Resources retrieved successfully.",
        data: { items: [{ id: "01a0c07f-1", name: "HQ", code: "HQ" }], pagination: { has_next: false, has_previous: false, page_size: 10 } },
      },
    },
  })
  async listBranches(@Query() query: ListQueryDto) {
    const page = await this.branches.list(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("branches")
  @RequireFeature("branches", "edit")
  @ApiOperation({ summary: "Create branch", description: "Adds a branch office (e.g. HQ, CTG) to the current tenant." })
  @ApiBody({ schema: { example: { name: "Chittagong", code: "CTG", city: "Chittagong" } } })
  @ApiResponse({ status: 200, description: "Created branch.", schema: { example: EX_BRANCH } })
  @ApiResponse({ status: 401, schema: { example: ERR_UNAUTH } })
  @ApiResponse({ status: 403, schema: { example: ERR_FORBIDDEN } })
  async createBranch(@Body() body: Partial<Branch>, @CurrentUser() user: User) {
    const row = await this.branches.create(body, user.id);
    return successResponse(row, "Branch created successfully.");
  }

  @Get("branches/:id")
  @RequireFeature("branches", "view")
  @ApiOperation({ summary: "Get branch", description: "Fetch one branch by UUID." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: EX_BRANCH } })
  @ApiResponse({ status: 404, schema: { example: ERR_NOT_FOUND } })
  async getBranch(@Param("id") id: string) {
    return successResponse(await this.branches.get(id));
  }

  @Patch("branches/:id")
  @RequireFeature("branches", "edit")
  @ApiOperation({ summary: "Update branch", description: "Partial update of name/city/manager." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { name: "Chittagong", city: "Chittagong" } } })
  @ApiResponse({ status: 200, description: "Updated branch.", schema: { example: EX_BRANCH } })
  async updateBranch(@Param("id") id: string, @Body() body: Partial<Branch>, @CurrentUser() user: User) {
    return successResponse(await this.branches.update(id, body, user.id), "Branch updated.");
  }

  @Delete("branches/:id")
  @RequireFeature("branches", "full")
  @ApiOperation({ summary: "Archive branch", description: "Soft-deletes a branch. Requires `branches:full`." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Branch archived.", data: { ok: true } } } })
  async removeBranch(@Param("id") id: string, @CurrentUser() user: User) {
    await this.branches.remove(id, user.id);
    return successResponse({ ok: true }, "Branch archived.");
  }

  @Get("roles")
  @RequireFeature("permissions", "view")
  @ApiOperation({ summary: "List roles", description: "Roles with their `permissions` (featureKey + level)." })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: "Resources retrieved successfully.",
        data: { items: [{ id: "01a0c07f-r", slug: "agent", permissions: [{ featureKey: "bookings", permissionLevel: "edit" }] }], pagination: { has_next: false, has_previous: false, page_size: 10 } },
      },
    },
  })
  async roles(@Query() query: ListQueryDto) {
    const page = await paginate(this.em, Role, {}, { cursor: query.cursor, pageSize: query.page_size, populate: ["permissions"] });
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("roles")
  @RequireFeature("permissions", "edit")
  @ApiOperation({ summary: "Create role", description: "Creates a role plus optional initial permission rows." })
  @ApiBody({
    schema: { example: { name: "Agent", slug: "agent", permissions: [{ featureKey: "bookings", permissionLevel: "edit" }] } },
  })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Role created.", data: { id: "01a0c07f-r", slug: "agent" } } },
  })
  async createRole(
    @Body() body: { name: string; slug: string; description?: string; permissions?: { featureKey: string; permissionLevel: RolePermission["permissionLevel"] }[] },
    @CurrentUser() user: User,
  ) {
    const role = this.em.create(Role, { name: body.name, slug: body.slug, description: body.description, createdBy: user.id } as Role);
    await this.em.persistAndFlush(role);
    const seen = new Set<string>();
    for (const p of body.permissions ?? []) {
      if (!seen.has(p.featureKey) && p.permissionLevel && p.permissionLevel !== "none") {
        seen.add(p.featureKey);
        this.em.create(RolePermission, { role, featureKey: p.featureKey, permissionLevel: p.permissionLevel });
      }
    }
    await this.em.flush();
    await role.permissions.init();
    return successResponse(role, "Role created.");
  }

  @Patch("roles/:id")
  @RequireFeature("permissions", "edit")
  @ApiOperation({ summary: "Update role", description: "Renames a role and/or replaces its permission matrix. System roles are read-only." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { permissions: [{ featureKey: "bookings", permissionLevel: "full" }] } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Role updated.", data: { id: "01a0c07f-r" } } } })
  async updateRole(
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string; permissions?: { featureKey: string; permissionLevel: RolePermission["permissionLevel"] }[] },
  ) {
    const role = await this.em.findOneOrFail(Role, { id }, { populate: ["permissions"] });
    if (role.isSystem && body.permissions !== undefined) {
      throw DomainError.forbidden("System roles are read-only.");
    }
    if (body.name !== undefined) role.name = body.name;
    if (body.description !== undefined) role.description = body.description;
    if (body.permissions !== undefined) {
      for (const p of [...role.permissions]) this.em.remove(p);
      const seen = new Set<string>();
      for (const p of body.permissions) {
        if (!seen.has(p.featureKey) && p.permissionLevel && p.permissionLevel !== "none") {
          seen.add(p.featureKey);
          this.em.create(RolePermission, { role, featureKey: p.featureKey, permissionLevel: p.permissionLevel });
        }
      }
    }
    await this.em.flush();
    await role.permissions.init();
    return successResponse(role, "Role updated.");
  }

  @Delete("roles/:id")
  @RequireFeature("permissions", "full")
  @ApiOperation({ summary: "Archive role", description: "Soft-deletes a custom role. System roles cannot be deleted." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Role archived.", data: { ok: true } } } })
  async removeRole(@Param("id") id: string, @CurrentUser() user: User) {
    const role = await this.em.findOneOrFail(Role, { id });
    if (role.isSystem) throw DomainError.forbidden("System roles cannot be deleted.");
    role.softDelete(user.id);
    await this.em.flush();
    return successResponse({ ok: true }, "Role archived.");
  }

  @Post("users/:id/roles")
  @RequireFeature("permissions", "edit")
  @ApiOperation({ summary: "Assign roles", description: "Replaces a user's role/branch assignments (branch-scoped RBAC)." })
  @ApiParam({ name: "id", description: "User UUID." })
  @ApiBody({ schema: { example: { assignments: [{ roleSlug: "agent", branchId: "01a0c07f-1111-0000-0000-000000000001" }] } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Assignments updated.", data: { ok: true } } } })
  async assign(
    @Param("id") id: string,
    @Body() body: { assignments: { roleSlug: string; branchId?: string }[] },
    @CurrentUser() actor: User,
  ) {
    await this.rbac.replaceAssignments(actor, id, body.assignments ?? []);
    return successResponse({ ok: true }, "Assignments updated.");
  }
}
