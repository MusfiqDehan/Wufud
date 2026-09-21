import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { BookingService } from "./booking.service";
import { CurrentUser } from "../shared/decorators/current-user.decorator";
import { User } from "../identity/entities/user.entity";
import { Public } from "../shared/decorators/public.decorator";
import { RequireFeature } from "../access/require-feature.guard";
import { ListQueryDto } from "../shared/dto/list-query.dto";
import { listSuccessResponse, successResponse } from "../shared/interceptors/success.interceptor";
import { EntityManager } from "@mikro-orm/postgresql";
import { RefundRequest } from "./entities/cancellation.entity";
import { paginate } from "../shared/pagination/cursor.paginator";
import { EX_BOOKING_RES, EX_PACKAGE_ITEM, ERR_FORBIDDEN, ERR_NOT_FOUND, ERR_UNAUTH } from "../shared/swagger/api-examples";

const EX_PACKAGES = {
  success: true,
  message: "Packages retrieved successfully.",
  data: { items: [EX_PACKAGE_ITEM], pagination: { has_next: false, has_previous: false, page_size: 10 } },
};

const EX_REFUND = {
  success: true,
  message: "Refund requested.",
  data: { id: "01a0c095-refund-0000-000000000001", amount: "10000", status: "requested" },
};

@ApiTags("Booking")
@ApiBearerAuth("access-token")
@Controller("api/v1")
export class BookingController {
  constructor(
    private readonly bookings: BookingService,
    private readonly em: EntityManager,
  ) {}

  @Public()
  @Get("packages")
  @ApiOperation({
    summary: "Browse public packages",
    description: "Published packages + tiers for the current tenant storefront. No auth required.",
  })
  @ApiQuery({ name: "search", required: false, example: "Hajj" })
  @ApiResponse({ status: 200, description: "Public package list.", schema: { example: EX_PACKAGES } })
  async publicPackages(@Query() query: ListQueryDto) {
    const page = await this.bookings.listPackages(query, true);
    return listSuccessResponse(page.items, page.pagination, "Packages retrieved successfully.");
  }

  @Get("admin/packages")
  @RequireFeature("packages", "view")
  @ApiOperation({ summary: "List all packages (staff)", description: "Includes unpublished packages for agency staff." })
  @ApiResponse({ status: 200, schema: { example: EX_PACKAGES } })
  @ApiResponse({ status: 401, schema: { example: ERR_UNAUTH } })
  async adminPackages(@Query() query: ListQueryDto) {
    const page = await this.bookings.listPackages(query, false);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("admin/packages")
  @RequireFeature("packages", "edit")
  @ApiOperation({ summary: "Create package", description: "Creates a package with optional tiers." })
  @ApiBody({
    schema: {
      example: { name: "Hajj 2027", kind: "hajj", departureDate: "2027-05-20", tiers: [{ name: "Economy", price: "250000", seatsTotal: 40 }] },
    },
  })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Package created successfully.", data: EX_PACKAGE_ITEM } } })
  async createPackage(@Body() body: Record<string, unknown>, @CurrentUser() user: User) {
    return successResponse(await this.bookings.createPackage(body as never, user), "Package created successfully.");
  }

  @Get("admin/packages/:id")
  @RequireFeature("packages", "view")
  @ApiOperation({ summary: "Get package", description: "Fetch one agency package with tiers." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Operation successful.", data: EX_PACKAGE_ITEM } } })
  @ApiResponse({ status: 404, schema: { example: ERR_NOT_FOUND } })
  async getPackage(@Param("id") id: string) {
    return successResponse(await this.bookings.getPackage(id));
  }

  @Patch("admin/packages/:id")
  @RequireFeature("packages", "edit")
  @ApiOperation({ summary: "Update package", description: "Partial update (dates, name, publish flags)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { name: "Hajj 2027 (Updated)" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Package updated.", data: EX_PACKAGE_ITEM } } })
  async updatePackage(@Param("id") id: string, @Body() body: Record<string, unknown>, @CurrentUser() user: User) {
    return successResponse(await this.bookings.updatePackage(id, body as never, user), "Package updated.");
  }

  @Delete("admin/packages/:id")
  @RequireFeature("packages", "full")
  @ApiOperation({ summary: "Archive package", description: "Soft-deletes a package. Financial history is retained." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Package archived. Financial history retained.", data: { ok: true } } } })
  async removePackage(@Param("id") id: string, @CurrentUser() user: User) {
    await this.bookings.removePackage(id, user);
    return successResponse({ ok: true }, "Package archived. Financial history retained.");
  }

  @Post("admin/packages/:id/tiers")
  @RequireFeature("packages", "edit")
  @ApiOperation({ summary: "Add tier", description: "Adds a price/seat tier (Economy/Standard/VIP) to a package." })
  @ApiParam({ name: "id", description: "Package UUID." })
  @ApiBody({ schema: { example: { name: "VIP", price: "550000", seatsTotal: 8 } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Tier created.", data: { id: "01a0c07f-tier-0001", name: "VIP" } } } })
  async addTier(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return successResponse(await this.bookings.addTier(id, body as never), "Tier created.");
  }

  @Patch("admin/packages/tiers/:id")
  @RequireFeature("packages", "edit")
  @ApiOperation({ summary: "Update tier / quota", description: "Updates tier name/price, or `seatsTotal` quota (never below confirmed seats)." })
  @ApiParam({ name: "id", description: "Tier UUID." })
  @ApiBody({ schema: { example: { seatsTotal: 40 } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Quota updated.", data: { id: "01a0c07f-tier-0001", seatsTotal: 40 } } } })
  async quota(@Param("id") id: string, @Body() body: { seatsTotal?: number; name?: string; price?: string }) {
    if (body.seatsTotal !== undefined && (body.name !== undefined || body.price !== undefined)) {
      return successResponse(await this.bookings.updateTier(id, body as never), "Tier updated.");
    }
    if (body.seatsTotal !== undefined) {
      return successResponse(await this.bookings.updateTierQuota(id, body.seatsTotal), "Quota updated.");
    }
    return successResponse(await this.bookings.updateTier(id, body as never), "Tier updated.");
  }

  @Delete("admin/packages/tiers/:id")
  @RequireFeature("packages", "full")
  @ApiOperation({ summary: "Archive tier", description: "Soft-deletes a tier." })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Tier archived.", data: { ok: true } } } })
  async removeTier(@Param("id") id: string, @CurrentUser() user: User) {
    await this.bookings.removeTier(id, user);
    return successResponse({ ok: true }, "Tier archived.");
  }

  @Post("bookings")
  @ApiOperation({
    summary: "Create booking",
    description:
      "Holds seats for a tier and creates pilgrim rows + installment schedule when `paymentMode: installment`. " +
      "Requires a pilgrim/staff JWT (use `POST /api/v1/auth/storefront` on the storefront first).",
  })
  @ApiBody({
    schema: {
      example: {
        tierId: "01a0c07f-9ce2-75bb-b8d7-26dffd182b86",
        paymentMode: "installment",
        pilgrims: [
          { fullName: "Demo One", passportNumber: "B1234567", nationality: "BD" },
          { fullName: "Demo Two", passportNumber: "B7654321", nationality: "BD" },
        ],
      },
    },
  })
  @ApiResponse({ status: 200, description: "Held booking.", schema: { example: EX_BOOKING_RES } })
  @ApiResponse({ status: 401, schema: { example: ERR_UNAUTH } })
  @ApiResponse({ status: 409, description: "Not enough seats.", schema: { example: { success: false, message: "Not enough seats remain for this tier.", error_code: "SEAT_UNAVAILABLE" } } })
  async create(@Body() body: {
    tierId: string;
    paymentMode: "full" | "installment";
    pilgrims: { fullName: string; passportNumber: string; nationality?: string }[];
    branchId?: string;
  }, @CurrentUser() user: User) {
    return successResponse(await this.bookings.createBooking(user, body), "Booking created successfully.");
  }

  @Get("bookings")
  @RequireFeature("bookings", "view")
  @ApiOperation({ summary: "List bookings (staff)", description: "Branch-scoped booking list for staff." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-1", status: "held" }], pagination: { has_next: false, has_previous: false, page_size: 10 } } } },
  })
  async list(@Query() query: ListQueryDto, @CurrentUser() user: User) {
    const page = await this.bookings.listBookings(query, user, false);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Get("me/bookings")
  @ApiOperation({ summary: "My bookings", description: "Bookings owned by the caller (pilgrim portal)." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c096-1", status: "confirmed", frozenPrice: "500000.00" }], pagination: { has_next: false, has_previous: false, page_size: 10 } } } },
  })
  async mine(@Query() query: ListQueryDto, @CurrentUser() user: User) {
    const page = await this.bookings.listBookings(query, user, true);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Get("me/bookings/:id")
  @ApiOperation({ summary: "My booking detail", description: "One pilgrim booking with package, tier, pilgrims, installments and payments." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: EX_BOOKING_RES } })
  async myDetail(@Param("id") id: string, @CurrentUser() user: User) {
    return successResponse(await this.bookings.myBookingDetail(id, user));
  }

  @Get("bookings/:id")
  @RequireFeature("bookings", "view")
  @ApiOperation({ summary: "Get booking", description: "Fetch one booking with tier + pilgrims." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: EX_BOOKING_RES } })
  @ApiResponse({ status: 404, schema: { example: ERR_NOT_FOUND } })
  async get(@Param("id") id: string) {
    return successResponse(await this.bookings.getBooking(id));
  }

  @Patch("bookings/:id")
  @RequireFeature("bookings", "edit")
  @ApiOperation({ summary: "Update booking status", description: "Staff transition, e.g. held -> confirmed." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { status: "confirmed" } } })
  @ApiResponse({ status: 200, schema: { example: EX_BOOKING_RES } })
  async update(@Param("id") id: string, @Body() body: { status?: "held" | "confirmed" | "defaulted" | "cancelled" }, @CurrentUser() user: User) {
    return successResponse(await this.bookings.updateBooking(id, user, body), "Booking updated.");
  }

  @Delete("bookings/:id")
  @RequireFeature("bookings", "full")
  @ApiOperation({ summary: "Archive booking", description: "Soft-deletes a booking. Financial rows are retained for reports." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Booking archived. Financial history retained.", data: { ok: true } } } })
  async remove(@Param("id") id: string, @CurrentUser() user: User) {
    await this.bookings.removeBooking(id, user);
    return successResponse({ ok: true }, "Booking archived. Financial history retained.");
  }

  @Get("bookings/:id/installments")
  @RequireFeature("bookings", "view")
  @ApiOperation({ summary: "Booking installments", description: "Fixed schedule generated at booking time (down payment + dues)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ sequence: 0, amountDue: "210000", status: "paid" }] } } },
  })
  async installments(@Param("id") id: string) {
    return listSuccessResponse(await this.bookings.listInstallments(id));
  }

  @Get("pilgrims")
  @RequireFeature("pilgrims", "view")
  @ApiOperation({ summary: "List pilgrims", description: "Pilgrim rows, optionally filtered by `bookingId`. Requires `pilgrims:view` (agency directory)." })
  @ApiQuery({ name: "bookingId", required: false })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-p1", fullName: "Demo One", passportNumber: "B1234567" }] } } },
  })
  async pilgrims(@Query() query: ListQueryDto, @Query("bookingId") bookingId?: string) {
    const page = await this.bookings.listPilgrims(query, bookingId);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Get("cancellation-rules")
  @RequireFeature("bookings", "view")
  @ApiOperation({ summary: "List cancellation rules", description: "Charge % by days-before-departure." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ daysBeforeDeparture: 90, chargePercent: "10" }] } } },
  })
  async rules() {
    return listSuccessResponse(await this.bookings.listCancellationRules());
  }

  @Post("cancellation-rules")
  @RequireFeature("bookings", "edit")
  @ApiOperation({ summary: "Create cancellation rule", description: "Adds a days-before-departure charge rule." })
  @ApiBody({ schema: { example: { daysBeforeDeparture: 30, chargePercent: "25" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Rule saved.", data: { id: "01a0c095-rule-1" } } } })
  async createRule(@Body() body: Record<string, unknown>, @CurrentUser() user: User) {
    return successResponse(await this.bookings.upsertCancellationRule(body as never, user), "Rule saved.");
  }

  @Patch("cancellation-rules/:id")
  @RequireFeature("bookings", "edit")
  @ApiOperation({ summary: "Update cancellation rule", description: "Edits charge % / window." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { chargePercent: "25" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Rule saved.", data: { id: "01a0c095-rule-1" } } } })
  async updateRule(@Param("id") id: string, @Body() body: Record<string, unknown>, @CurrentUser() user: User) {
    return successResponse(await this.bookings.upsertCancellationRule({ ...(body as object), id } as never, user), "Rule saved.");
  }

  @Delete("cancellation-rules/:id")
  @RequireFeature("bookings", "full")
  @ApiOperation({ summary: "Archive rule", description: "Soft-deletes a cancellation rule." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Rule archived.", data: { ok: true } } } })
  async removeRule(@Param("id") id: string, @CurrentUser() user: User) {
    await this.bookings.removeCancellationRule(id, user);
    return successResponse({ ok: true }, "Rule archived.");
  }

  @Get("audit")
  @RequireFeature("audit", "view")
  @ApiOperation({ summary: "Tenant audit log", description: "State-changing actions (booking.create/cancel, etc.). Requires `audit:view`." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ action: "booking.create", targetType: "booking" }] } } },
  })
  async audit(@Query() query: ListQueryDto) {
    const page = await this.bookings.tenantAudit(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("bookings/:id/cancel")
  @RequireFeature("bookings", "edit")
  @ApiOperation({ summary: "Cancel booking", description: "Full cancel or partial (pass `pilgrimIds`). Applies rule-based charges." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { pilgrimIds: ["01a0c095-p1"] } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Booking cancelled.", data: { id: "01a0c095-1", status: "cancelled" } } } })
  async cancel(@Param("id") id: string, @Body() body: { pilgrimIds?: string[] }, @CurrentUser() user: User) {
    return successResponse(await this.bookings.cancel(id, user, body.pilgrimIds), "Booking cancelled.");
  }

  @Post("bookings/:id/refunds")
  @RequireFeature("refunds", "edit")
  @ApiOperation({ summary: "Request refund", description: "Creates a refund request (request -> approval -> processing). Never exceeds received amount." })
  @ApiParam({ name: "id", description: "Booking UUID." })
  @ApiBody({ schema: { example: { amount: "10000" } } })
  @ApiResponse({ status: 200, description: "Refund requested.", schema: { example: EX_REFUND } })
  @ApiResponse({ status: 403, schema: { example: ERR_FORBIDDEN } })
  async refund(@Param("id") id: string, @Body() body: { amount: string }, @CurrentUser() user: User) {
    return successResponse(await this.bookings.requestRefund(id, body.amount, user), "Refund requested.");
  }

  @Get("refunds")
  @RequireFeature("refunds", "view")
  @ApiOperation({ summary: "List refunds", description: "Refund requests with status." })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-r1", amount: "10000", status: "requested" }] } } } })
  async refunds(@Query() query: ListQueryDto) {
    const page = await paginate(this.em, RefundRequest, {}, { cursor: query.cursor, pageSize: query.page_size });
    return listSuccessResponse(page.items, page.pagination);
  }

  @Patch("refunds/:id")
  @RequireFeature("refunds", "full")
  @ApiOperation({ summary: "Process refund", description: "Approve/process a refund (`requested|approved|paid|rejected`)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { status: "approved" } } })
  @ApiResponse({ status: 200, schema: { example: EX_REFUND } })
  async processRefund(@Param("id") id: string, @Body() body: { status: RefundRequest["status"] }, @CurrentUser() user: User) {
    return successResponse(await this.bookings.processRefund(id, body.status, user), "Refund updated.");
  }
}
