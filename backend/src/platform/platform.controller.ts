import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../shared/decorators/current-user.decorator";
import { User } from "../identity/entities/user.entity";
import { RequireFeature } from "../access/require-feature.guard";
import { PlatformService } from "./platform.service";
import { ListQueryDto } from "../shared/dto/list-query.dto";
import { listSuccessResponse, successResponse } from "../shared/interceptors/success.interceptor";
import {
  AddPlatformDomainDto,
  BulkTenantFeaturesDto,
  CreateTenantDto,
  SetTenantFeatureDto,
  SetTenantStatusDto,
  SubscribeTenantDto,
  UpsertPlanDto,
} from "./dto/platform.dto";
import { ApiErrorEnvelopeDto } from "../shared/swagger/envelope.dto";

const TENANT_EXAMPLE = {
  success: true,
  message: "Resources retrieved successfully.",
  data: {
    items: [
      {
        id: "01a0c07f-46fa-773f-abf9-24c46dfc57bd",
        name: "Nur Travels",
        slug: "demo",
        status: "active",
        plan: "growth",
        maxUsers: 50,
        maxBranches: 5,
      },
    ],
    pagination: { has_next: false, has_previous: false, page_size: 10 },
  },
};

const PLAN_EXAMPLE = {
  success: true,
  message: "Plan saved.",
  data: {
    id: "01a0c07f-46fa-773f-abf9-24c46dfc57bd",
    name: "Growth",
    slug: "growth",
    priceMonthly: "12900",
    currency: "BDT",
    features: ["dashboard", "packages", "bookings", "reports"],
    maxUsers: 50,
    maxBranches: 5,
  },
};

const FEATURES_EXAMPLE = {
  success: true,
  message: "Feature state retrieved successfully.",
  data: {
    tenant_id: "01a0c07f-46fa-773f-abf9-24c46dfc57bd",
    plan: "growth",
    max_users: 50,
    max_branches: 5,
    baseline: { dashboard: true, packages: true, reports: true },
    overrides: { reports: false },
    effective: { dashboard: true, packages: true, reports: false },
    enabled: ["dashboard", "packages"],
  },
};

@ApiTags("Platform")
@ApiBearerAuth("access-token")
@Controller("api/v1/platform")
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get("tenants")
  @RequireFeature("platform.tenants", "view")
  @ApiOperation({ summary: "List tenants", description: "Cursor-paginated agencies on the platform." })
  @ApiResponse({ status: 200, description: "List envelope with tenant rows.", schema: { example: TENANT_EXAMPLE } })
  @ApiResponse({ status: 401, type: ApiErrorEnvelopeDto })
  async tenants(@Query() query: ListQueryDto) {
    const page = await this.platform.listTenants(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("tenants")
  @RequireFeature("platform.tenants", "edit")
  @ApiOperation({ summary: "Provision tenant", description: "Creates schema, seeds roles, and optionally invites the owner." })
  @ApiBody({ type: CreateTenantDto })
  @ApiResponse({
    status: 201,
    description: "Created tenant.",
    schema: {
      example: {
        success: true,
        message: "Tenant created successfully.",
        data: { id: "01a0c07f-46fa-773f-abf9-24c46dfc57bd", name: "Nur Travels", slug: "nur-travels", schemaName: "t_nur_travels" },
      },
    },
  })
  async createTenant(@Body() body: CreateTenantDto, @CurrentUser() user: User) {
    return successResponse(await this.platform.createTenant(body, user), "Tenant created successfully.");
  }

  @Patch("tenants/:id/status")
  @RequireFeature("platform.tenants", "edit")
  @ApiOperation({ summary: "Update tenant status", description: "Active/trial tenants can sign in; suspended blocks entry." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: SetTenantStatusDto })
  async status(@Param("id") id: string, @Body() body: SetTenantStatusDto, @CurrentUser() user: User) {
    return successResponse(await this.platform.setStatus(id, body.status, user), "Tenant status updated.");
  }

  @Get("tenants/:id/stats")
  @RequireFeature("platform.tenants", "view")
  @ApiOperation({ summary: "Tenant usage stats" })
  @ApiParam({ name: "id", format: "uuid" })
  async stats(@Param("id") id: string) {
    return successResponse(await this.platform.tenantStats(id));
  }

  @Get("tenants/:id/features")
  @RequireFeature("platform.features", "view")
  @ApiOperation({
    summary: "Tenant feature entitlements",
    description: "Returns plan baseline, per-tenant overrides, and effective package-gated modules.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: FEATURES_EXAMPLE } })
  async tenantFeatures(@Param("id") id: string) {
    return successResponse(await this.platform.getTenantFeatures(id), "Feature state retrieved successfully.");
  }

  @Patch("tenants/:id/features")
  @RequireFeature("platform.features", "edit")
  @ApiOperation({
    summary: "Bulk update tenant feature overrides",
    description: "Sets overrides only where desired state differs from the plan baseline. Omitted keys are unchanged.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: BulkTenantFeaturesDto })
  @ApiResponse({ status: 200, schema: { example: FEATURES_EXAMPLE } })
  async syncFeatures(@Param("id") id: string, @Body() body: BulkTenantFeaturesDto) {
    return successResponse(await this.platform.syncTenantFeatures(id, body.features), "Features updated successfully.");
  }

  @Post("tenants/:id/features")
  @RequireFeature("platform.features", "edit")
  @ApiOperation({ summary: "Set one feature override", description: "Upserts a single row in tenant_feature_overrides." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: SetTenantFeatureDto })
  async feature(@Param("id") id: string, @Body() body: SetTenantFeatureDto) {
    return successResponse(await this.platform.setFeature(id, body.featureKey, body.enabled), "Feature updated.");
  }

  @Get("billing/overview")
  @RequireFeature("platform.billing", "view")
  @ApiOperation({ summary: "Billing overview", description: "Tenant/plan counts for the Billing workspace. Requires `platform.billing:view` (no tenant/plan read needed)." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Billing overview retrieved successfully.", data: { tenants: 3, on_plan: 2, unassigned: 1, plans: 3 } } },
  })
  async billingOverview() {
    return successResponse(await this.platform.billingOverview(), "Billing overview retrieved successfully.");
  }

  @Post("tenants/:id/subscribe")
  @RequireFeature("platform.billing", "edit")
  @ApiOperation({
    summary: "Assign subscription plan",
    description: "Creates an active subscription period and copies plan features, max users, and max branches onto the tenant.",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: SubscribeTenantDto })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: "Subscription updated.",
        data: { id: "01a0c07f-46fa-773f-abf9-24c46dfc57bd", status: "active", plan: { slug: "growth" } },
      },
    },
  })
  async subscribe(@Param("id") id: string, @Body() body: SubscribeTenantDto) {
    return successResponse(await this.platform.subscribe(id, body.planId), "Subscription updated.");
  }

  @Get("plans")
  @RequireFeature("platform.plans", "view")
  @ApiOperation({ summary: "List billing plans" })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        message: "Resources retrieved successfully.",
        data: {
          items: [
            { id: "01a0c07f-46fa-773f-abf9-24c46dfc57bd", name: "Starter", slug: "starter", priceMonthly: "4900" },
            { id: "01a0c07f-46fa-773f-abf9-24c46dfc57bc", name: "Growth", slug: "growth", priceMonthly: "12900" },
          ],
          pagination: { has_next: false, has_previous: false, page_size: 10 },
        },
      },
    },
  })
  async plans(@Query() query: ListQueryDto) {
    const page = await this.platform.listPlans(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("plans")
  @RequireFeature("platform.plans", "edit")
  @ApiOperation({ summary: "Create or update plan", description: "Send `id` to update an existing plan row." })
  @ApiBody({ type: UpsertPlanDto })
  @ApiResponse({ status: 200, schema: { example: PLAN_EXAMPLE } })
  async upsertPlan(@Body() body: UpsertPlanDto) {
    return successResponse(await this.platform.upsertPlan(body), "Plan saved.");
  }

  @Get("domains")
  @RequireFeature("platform.domains", "view")
  @ApiOperation({ summary: "List platform hostnames", description: "Hosts served on the platform plane (e.g. wufud.localhost)." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ host: "wufud.localhost", isPrimary: true }] } } },
  })
  async domains() {
    return listSuccessResponse(await this.platform.domains());
  }

  @Post("domains")
  @RequireFeature("platform.domains", "edit")
  @ApiOperation({ summary: "Add platform hostname", description: "Registers an additional platform host." })
  @ApiBody({ type: AddPlatformDomainDto })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Domain added.", data: { host: "wufud.example.com" } } } })
  async addDomain(@Body() body: AddPlatformDomainDto) {
    return successResponse(await this.platform.addDomain(body.host, body.isPrimary), "Domain added.");
  }

  @Get("seo")
  @RequireFeature("platform.seo", "view")
  @ApiOperation({ summary: "Get platform SEO", description: "Global title/description/OG defaults for the marketing site." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Operation successful.", data: { title: "Wufud — Pilgrimage Booking SaaS" } } },
  })
  async seo() {
    return successResponse(await this.platform.getSeo());
  }

  @Patch("seo")
  @RequireFeature("platform.seo", "edit")
  @ApiOperation({ summary: "Save platform SEO", description: "Partial update of global SEO settings." })
  @ApiBody({ schema: { example: { title: "Wufud — Pilgrimage Booking SaaS", description: "Agency ERP and booking for Hajj and Umrah." } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "SEO updated.", data: { title: "Wufud" } } } })
  async saveSeo(@Body() body: Record<string, unknown>) {
    return successResponse(await this.platform.saveSeo(body), "SEO updated.");
  }

  @Get("audit")
  @RequireFeature("platform.audit", "view")
  @ApiOperation({ summary: "Platform audit log", description: "SaaS-level actions (tenant.create/status, etc.)." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ action: "tenant.create", targetType: "tenant" }] } } },
  })
  async audit(@Query() query: ListQueryDto) {
    const page = await this.platform.auditLog(query);
    return listSuccessResponse(page.items, page.pagination);
  }
}
