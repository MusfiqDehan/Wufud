import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AccountsService } from "./accounts.service";
import { CurrentUser } from "../shared/decorators/current-user.decorator";
import { User } from "../identity/entities/user.entity";
import { RequireFeature } from "../access/require-feature.guard";
import { ListQueryDto } from "../shared/dto/list-query.dto";
import { listSuccessResponse, successResponse } from "../shared/interceptors/success.interceptor";
import { EntityManager } from "@mikro-orm/postgresql";
import { Vendor } from "./entities/vendor.entity";
import { StockItem } from "./entities/stock.entity";
import { TenantSettings } from "./entities/reconciliation.entity";
import { Domain } from "../tenancy/entities/domain.entity";
import { TraefikSyncService } from "../tenancy/traefik-sync.service";
import { getTenantStore } from "../tenancy/tenant-context";
import { randomBytes } from "node:crypto";
import { ERR_FORBIDDEN, ERR_NOT_FOUND, ERR_UNAUTH } from "../shared/swagger/api-examples";

const EX_REPORT = {
  success: true,
  message: "Report retrieved successfully.",
  data: { bookings: 12, collected: "1500000.00", outstanding: "300000.00", refunds: "10000.00" },
};

@ApiTags("Accounts")
@ApiBearerAuth("access-token")
@Controller("api/v1")
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly em: EntityManager,
    private readonly traefik: TraefikSyncService,
  ) {}

  @Get("reports/summary")
  @RequireFeature("reports", "view")
  @ApiOperation({ summary: "Finance report summary", description: "Bookings, collections, outstanding installments, refunds, remaining quota." })
  @ApiResponse({ status: 200, schema: { example: EX_REPORT } })
  @ApiResponse({ status: 401, schema: { example: ERR_UNAUTH } })
  async summary() {
    return successResponse(await this.accounts.report(), "Report retrieved successfully.");
  }

  @Get("accounts/summary")
  @RequireFeature("accounts", "view")
  @ApiOperation({ summary: "Accounts overview summary", description: "Financial metrics, cashflow, vendor costs, and accounting health." })
  @ApiResponse({ status: 200, schema: { example: EX_REPORT } })
  @ApiResponse({ status: 401, schema: { example: ERR_UNAUTH } })
  async accountsSummary() {
    return successResponse(await this.accounts.report(), "Accounts summary retrieved successfully.");
  }

  @Get("manual-payments")
  @RequireFeature("payments", "view")
  @ApiOperation({ summary: "List manual payments", description: "Cash/branch collections pending approval." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-m1", amount: "50000", method: "cash", status: "pending" }] } } },
  })
  async manuals(@Query() query: ListQueryDto) {
    const page = await this.accounts.listManual(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("manual-payments")
  @RequireFeature("payments", "edit")
  @ApiOperation({ summary: "Record manual payment", description: "Records a branch/cash collection. Must be approved by a different user." })
  @ApiBody({ schema: { example: { bookingId: "01a0c095-151c-742e-98dc-3710cde36b60", amount: "50000", method: "cash" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Manual payment recorded.", data: { id: "01a0c095-m1", status: "pending" } } } })
  async record(@Body() body: { bookingId: string; amount: string; method?: "cash" | "card" | "bkash" | "nagad"; branchId?: string }, @CurrentUser() user: User) {
    return successResponse(await this.accounts.recordManual(user, body), "Manual payment recorded.");
  }

  @Post("manual-payments/:id/approve")
  @RequireFeature("payments", "full")
  @ApiOperation({ summary: "Approve manual payment", description: "Approver must differ from recorder (maker-checker)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Manual payment approved.", data: { id: "01a0c095-m1", status: "approved" } } } })
  async approve(@Param("id") id: string, @CurrentUser() user: User) {
    return successResponse(await this.accounts.approveManual(id, user), "Manual payment approved.");
  }

  @Post("manual-payments/:id/reject")
  @RequireFeature("payments", "full")
  @ApiOperation({ summary: "Reject manual payment", description: "Rejects with an optional note." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { note: "Receipt mismatch" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Manual payment rejected.", data: { id: "01a0c095-m1" } } } })
  async reject(@Param("id") id: string, @Body() body: { note?: string }, @CurrentUser() user: User) {
    return successResponse(await this.accounts.rejectManual(id, user, body.note), "Manual payment rejected.");
  }

  @Get("payments")
  @RequireFeature("payments", "view")
  @ApiOperation({ summary: "List gateway payments", description: "Ledger of confirmed gateway/manual payments." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-p1", amount: "500000.00", gatewaySlug: "stub" }] } } },
  })
  async payments(@Query() query: ListQueryDto) {
    const page = await this.accounts.listPayments(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Get("vendors")
  @RequireFeature("vendors", "view")
  @ApiOperation({ summary: "List vendors", description: "Hotels, airlines, transport, visa processors." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-v1", name: "Makkah Hotel Co", kind: "hotel" }] } } },
  })
  async vendors(@Query() query: ListQueryDto) {
    const page = await this.accounts.listVendors(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("vendors")
  @RequireFeature("vendors", "edit")
  @ApiOperation({ summary: "Create vendor", description: "Adds a fund-distribution vendor." })
  @ApiBody({ schema: { example: { name: "Makkah Hotel Co", kind: "hotel" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Vendor created.", data: { id: "01a0c095-v1" } } } })
  async vendor(@Body() body: Partial<Vendor>) {
    return successResponse(await this.accounts.createVendor(body), "Vendor created.");
  }

  @Patch("vendors/:id")
  @RequireFeature("vendors", "edit")
  @ApiOperation({ summary: "Update vendor", description: "Partial vendor update." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { name: "Makkah Hotel Co (Updated)" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Vendor updated.", data: { id: "01a0c095-v1" } } } })
  async updateVendor(@Param("id") id: string, @Body() body: Partial<Vendor>) {
    return successResponse(await this.accounts.updateVendor(id, body), "Vendor updated.");
  }

  @Delete("vendors/:id")
  @RequireFeature("vendors", "full")
  @ApiOperation({ summary: "Archive vendor", description: "Soft-deletes a vendor." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Vendor archived.", data: { ok: true } } } })
  async removeVendor(@Param("id") id: string, @CurrentUser() user: User) {
    await this.accounts.removeVendor(id, user.id);
    return successResponse({ ok: true }, "Vendor archived.");
  }

  @Get("disbursements")
  @RequireFeature("disbursements", "view")
  @ApiOperation({ summary: "List disbursements", description: "SAR costs with FX + BDT equivalent per vendor/booking." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-d1", amountSar: "2000", fxRate: "32.5", amountBdt: "65000" }] } } },
  })
  async disbursements(@Query() query: ListQueryDto) {
    const page = await this.accounts.listDisbursements(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("disbursements")
  @RequireFeature("disbursements", "edit")
  @ApiOperation({ summary: "Record disbursement", description: "Vendor payout in SAR with FX rate; BDT equivalent is stored." })
  @ApiBody({ schema: { example: { vendorId: "01a0c095-v1", amountSar: "2000", fxRate: "32.5", note: "Hotel advance" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Disbursement recorded.", data: { id: "01a0c095-d1" } } } })
  async disburse(@Body() body: { vendorId: string; bookingId?: string; amountSar: string; fxRate: string; note?: string }) {
    return successResponse(await this.accounts.disburse(body), "Disbursement recorded.");
  }

  @Get("stock")
  @RequireFeature("stock", "view")
  @ApiOperation({ summary: "List stock items", description: "Ihram sets, bags, SIM cards issued to pilgrims." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-s1", name: "Ihram set", quantity: 100 }] } } },
  })
  async stockList(@Query() query: ListQueryDto) {
    const page = await this.accounts.listStock(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("stock")
  @RequireFeature("stock", "edit")
  @ApiOperation({ summary: "Create stock item", description: "Adds an inventory SKU." })
  @ApiBody({ schema: { example: { name: "Ihram set", quantity: 100 } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Stock item created.", data: { id: "01a0c095-s1" } } } })
  async stock(@Body() body: Partial<StockItem>) {
    const item = this.em.create(StockItem, body as StockItem);
    await this.em.persistAndFlush(item);
    return successResponse(item, "Stock item created.");
  }

  @Patch("stock/:id")
  @RequireFeature("stock", "edit")
  @ApiOperation({ summary: "Update stock item", description: "Adjusts name/quantity." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { quantity: 90 } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Stock item updated.", data: { id: "01a0c095-s1" } } } })
  async updateStock(@Param("id") id: string, @Body() body: Partial<StockItem>) {
    return successResponse(await this.accounts.updateStock(id, body), "Stock item updated.");
  }

  @Delete("stock/:id")
  @RequireFeature("stock", "full")
  @ApiOperation({ summary: "Archive stock item", description: "Soft-deletes inventory." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Stock item archived.", data: { ok: true } } } })
  async removeStock(@Param("id") id: string, @CurrentUser() user: User) {
    await this.accounts.removeStock(id, user.id);
    return successResponse({ ok: true }, "Stock item archived.");
  }

  @Get("stock/issues")
  @RequireFeature("stock", "view")
  @ApiOperation({ summary: "List stock issues", description: "Items issued per booking." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-si1", quantity: 2 }] } } },
  })
  async stockIssues(@Query() query: ListQueryDto) {
    const page = await this.accounts.listStockIssues(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("stock/issue")
  @RequireFeature("stock", "edit")
  @ApiOperation({ summary: "Issue stock", description: "Issues quantity of an item, optionally linked to a booking." })
  @ApiBody({ schema: { example: { itemId: "01a0c095-s1", quantity: 2, bookingId: "01a0c095-151c-742e-98dc-3710cde36b60" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Stock issued.", data: { id: "01a0c095-si1" } } } })
  async issue(@Body() body: { itemId: string; quantity: number; bookingId?: string }) {
    return successResponse(await this.accounts.issueStock(body), "Stock issued.");
  }

  @Get("expenses")
  @RequireFeature("expenses", "view")
  @ApiOperation({ summary: "List expenses", description: "Agency overhead expenses." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-e1", title: "Office rent", amount: "30000" }] } } },
  })
  async expenses(@Query() query: ListQueryDto) {
    const page = await this.accounts.listExpenses(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("expenses")
  @RequireFeature("expenses", "edit")
  @ApiOperation({ summary: "Record expense", description: "Adds an expense row." })
  @ApiBody({ schema: { example: { title: "Office rent", amount: "30000" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Expense recorded.", data: { id: "01a0c095-e1" } } } })
  async expense(@Body() body: Record<string, unknown>) {
    return successResponse(await this.accounts.addExpense(body), "Expense recorded.");
  }

  @Patch("expenses/:id")
  @RequireFeature("expenses", "edit")
  @ApiOperation({ summary: "Update expense", description: "Partial expense update." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { amount: "32000" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Expense updated.", data: { id: "01a0c095-e1" } } } })
  async updateExpense(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return successResponse(await this.accounts.updateExpense(id, body as never), "Expense updated.");
  }

  @Delete("expenses/:id")
  @RequireFeature("expenses", "full")
  @ApiOperation({ summary: "Archive expense", description: "Soft-deletes an expense." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Expense archived.", data: { ok: true } } } })
  async removeExpense(@Param("id") id: string, @CurrentUser() user: User) {
    await this.accounts.removeExpense(id, user.id);
    return successResponse({ ok: true }, "Expense archived.");
  }

  @Get("settlements")
  @RequireFeature("settlements", "view")
  @ApiOperation({ summary: "List settlements", description: "Gateway settlement report imports." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-set1", gatewaySlug: "sslcommerz", status: "imported" }] } } },
  })
  async settlements(@Query() query: ListQueryDto) {
    const page = await this.accounts.listSettlements(query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("settlements")
  @RequireFeature("settlements", "edit")
  @ApiOperation({ summary: "Import settlement", description: "Imports a gateway settlement window with tran rows for reconciliation." })
  @ApiBody({
    schema: { example: { gatewaySlug: "sslcommerz", periodStart: "2026-09-01", periodEnd: "2026-09-07", items: [{ tranId: "TXN-01", amount: "500000.00" }] } },
  })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Settlement imported.", data: { id: "01a0c095-set1" } } } })
  async settle(@Body() body: { gatewaySlug: string; periodStart: string; periodEnd: string; items: { tranId: string; amount: string }[] }) {
    return successResponse(await this.accounts.importSettlement(body), "Settlement imported.");
  }

  @Get("settlements/:id/items")
  @RequireFeature("settlements", "view")
  @ApiOperation({ summary: "Settlement items", description: "Rows of one settlement import." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ tranId: "TXN-01", amount: "500000.00" }] } } },
  })
  async settlementItems(@Param("id") id: string, @Query() query: ListQueryDto) {
    const page = await this.accounts.settlementItems(id, query);
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("reconciliation/:id/resolve")
  @RequireFeature("settlements", "full")
  @ApiOperation({ summary: "Resolve mismatch", description: "Admin resolves a gateway-vs-ledger mismatch with a note (never silently corrected)." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ schema: { example: { note: "Gateway fee adjusted" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Mismatch resolved by admin.", data: { id: "01a0c095-r1" } } } })
  @ApiResponse({ status: 403, schema: { example: ERR_FORBIDDEN } })
  async resolve(@Param("id") id: string, @Body() body: { note?: string }, @CurrentUser() user: User) {
    return successResponse(await this.accounts.resolveReconciliation(id, user, body.note), "Mismatch resolved by admin.");
  }

  @Get("settings")
  @RequireFeature("general_settings", "view")
  @ApiOperation({ summary: "Get agency settings", description: "Agency identity/defaults (displayName, logo, color, currency). Requires `general_settings:view`." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Operation successful.", data: { displayName: "Nur Travels", currency: "BDT" } } },
  })
  async settings() {
    return successResponse(await this.em.findOne(TenantSettings, {}));
  }

  @Post("settings")
  @RequireFeature("general_settings", "edit")
  @ApiOperation({ summary: "Save agency settings", description: "Upserts agency identity/defaults. Only identity fields are written here; marketing copy lives under `/seo`. Requires `general_settings:edit`." })
  @ApiBody({ schema: { example: { displayName: "Nur Travels", title: "Nur Travels | Hajj & Umrah" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Settings updated.", data: { displayName: "Nur Travels" } } } })
  async saveSettings(@Body() body: Partial<TenantSettings>) {
    const row = (await this.em.findOne(TenantSettings, {})) ?? this.em.create(TenantSettings, { displayName: "Agency" });
    const { displayName, logoUrl, primaryColor, currency } = body;
    this.em.assign(row, { displayName, logoUrl, primaryColor, currency });
    await this.em.persistAndFlush(row);
    return successResponse(row, "Settings updated.");
  }

  @Get("seo")
  @RequireFeature("seo", "view")
  @ApiOperation({ summary: "Get agency SEO & branding", description: "Marketing copy (title, description, keywords, og image). Requires `seo:view`." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Operation successful.", data: { title: "Nur Travels | Hajj & Umrah" } } },
  })
  async seo() {
    return successResponse(await this.em.findOne(TenantSettings, {}));
  }

  @Post("seo")
  @RequireFeature("seo", "edit")
  @ApiOperation({ summary: "Save agency SEO & branding", description: "Upserts marketing copy only. Requires `seo:edit`." })
  @ApiBody({ schema: { example: { title: "Nur Travels | Hajj & Umrah", description: "Trusted Hajj and Umrah packages", keywords: "hajj, umrah", ogImageUrl: "https://…" } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Branding saved.", data: { title: "Nur Travels" } } } })
  async saveSeo(@Body() body: Partial<TenantSettings>) {
    const row = (await this.em.findOne(TenantSettings, {})) ?? this.em.create(TenantSettings, { displayName: "Agency" });
    const { title, description, keywords, ogImageUrl } = body;
    this.em.assign(row, { title, description, keywords, ogImageUrl });
    await this.em.persistAndFlush(row);
    return successResponse(row, "Branding saved.");
  }

  @Get("domains")
  @RequireFeature("domains", "view")
  @ApiOperation({ summary: "List tenant domains", description: "Custom domains attached to this agency." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ id: "01a0c095-dom1", domain: "trips.example.com" }] } } },
  })
  async domains() {
    const tenant = getTenantStore()?.tenant;
    const rows = tenant ? await this.em.find(Domain, { tenant: tenant.id }) : [];
    return listSuccessResponse(rows);
  }

  @Post("domains")
  @RequireFeature("domains", "edit")
  @ApiOperation({ summary: "Add tenant domain", description: "Adds a custom domain and returns a TXT verification token." })
  @ApiBody({ schema: { example: { domain: "trips.example.com" } } })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Domain added. Add the TXT token to verify.", data: { id: "01a0c095-dom1", verificationToken: "wufud-verify=abc123" } } },
  })
  @ApiResponse({ status: 404, schema: { example: ERR_NOT_FOUND } })
  async addDomain(@Body() body: { domain: string }) {
    const tenant = getTenantStore()?.tenant;
    if (!tenant) throw DomainErrorNotFound();
    const domain = this.em.create(Domain, {
      tenant,
      domain: body.domain.toLowerCase(),
      verificationToken: `wufud-verify=${randomBytes(8).toString("hex")}`,
    });
    await this.em.persistAndFlush(domain);
    return successResponse(domain, "Domain added. Add the TXT token to verify.");
  }

  @Post("domains/:id/verify")
  @RequireFeature("domains", "edit")
  @ApiOperation({ summary: "Verify domain", description: "Marks ownership verified and syncs Traefik routes." })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Domain verified.", data: { id: "01a0c095-dom1" } } } })
  async verify(@Param("id") id: string) {
    const domain = await this.em.findOneOrFail(Domain, { id });
    domain.verifiedAt = new Date();
    await this.em.flush();
    await this.traefik.sync();
    return successResponse(domain, "Domain verified.");
  }
}

function DomainErrorNotFound() {
  const { DomainError } = require("../shared/errors/domain.error") as typeof import("../shared/errors/domain.error");
  return DomainError.notFound();
}
