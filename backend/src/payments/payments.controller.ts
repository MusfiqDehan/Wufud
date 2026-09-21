import { All, Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiExcludeEndpoint, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { PaymentsService } from "./payments.service";
import { Public } from "../shared/decorators/public.decorator";
import { RequireFeature } from "../access/require-feature.guard";
import { listSuccessResponse, successResponse } from "../shared/interceptors/success.interceptor";
import { getTenantStore } from "../tenancy/tenant-context";
import { ERR_FORBIDDEN, ERR_UNAUTH, EX_PAYMENT_INIT_RES } from "../shared/swagger/api-examples";

const EX_AVAILABLE = {
  success: true,
  message: "Resources retrieved successfully.",
  data: { items: [{ slug: "stub", name: "Stub", description: "Local test gateway", is_sandbox: true, is_configured: true }] },
};

@ApiTags("Payments")
@ApiBearerAuth("access-token")
@Controller("api/v1")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("gateways")
  @RequireFeature("platform.gateways", "view")
  @ApiOperation({ summary: "Gateway catalog (platform)", description: "All gateway definitions with platform credential status." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ slug: "sslcommerz", name: "SSLCommerz" }] } } },
  })
  async catalog() {
    return listSuccessResponse(await this.payments.listPublicCatalog());
  }

  @Post("gateways")
  @RequireFeature("platform.gateways", "edit")
  @ApiOperation({ summary: "Save gateway catalog row", description: "Creates or merges a platform gateway definition + credentials." })
  @ApiBody({ schema: { example: { slug: "sslcommerz", name: "SSLCommerz", platformCredentials: { store_id: "***" } } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Gateway saved.", data: { slug: "sslcommerz" } } } })
  async saveCatalog(@Body() body: Record<string, unknown>) {
    return successResponse(await this.payments.saveCatalog(body), "Gateway saved.");
  }

  @Post("gateways/:slug/toggle")
  @RequireFeature("platform.gateways", "edit")
  @ApiOperation({ summary: "Toggle gateway for tenants", description: "Enables/disables a gateway across tenant storefronts." })
  @ApiParam({ name: "slug", example: "sslcommerz" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Gateway toggled.", data: { slug: "sslcommerz" } } } })
  async toggle(@Param("slug") slug: string) {
    return successResponse(await this.payments.toggleCatalog(slug), "Gateway toggled.");
  }

  @Post("gateways/:slug/sandbox")
  @RequireFeature("platform.gateways", "edit")
  @ApiOperation({ summary: "Toggle catalog sandbox/live", description: "Switches the platform gateway between sandbox and live." })
  @ApiParam({ name: "slug", example: "sslcommerz" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Gateway mode updated.", data: { slug: "sslcommerz", is_sandbox: false } } } })
  async toggleCatalogSandbox(@Param("slug") slug: string) {
    return successResponse(await this.payments.toggleCatalogSandbox(slug), "Gateway mode updated.");
  }

  @Get("payments/gateways")
  @RequireFeature("gateways", "view")
  @ApiOperation({ summary: "Tenant gateway instances", description: "Configured/active state per gateway for the current tenant." })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Resources retrieved successfully.", data: { items: [{ slug: "stub", is_configured: true, is_active: true }] } } },
  })
  @ApiResponse({ status: 401, schema: { example: ERR_UNAUTH } })
  async tenantGateways() {
    return listSuccessResponse(await this.payments.tenantInstances());
  }

  @Patch("payments/gateways/:slug")
  @RequireFeature("gateways", "edit")
  @ApiOperation({ summary: "Save tenant gateway", description: "Stores tenant credentials for a platform-enabled gateway." })
  @ApiParam({ name: "slug", example: "stub" })
  @ApiBody({ schema: { example: { credentials: { store_id: "***", store_password: "***" } } } })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Gateway updated.", data: { slug: "stub" } } } })
  @ApiResponse({ status: 403, schema: { example: ERR_FORBIDDEN } })
  async saveInstance(@Param("slug") slug: string, @Body() body: Record<string, unknown>) {
    return successResponse(await this.payments.saveTenantInstance(slug, body as never), "Gateway updated.");
  }

  @Post("payments/gateways/:slug/toggle")
  @RequireFeature("gateways", "edit")
  @ApiOperation({ summary: "Toggle tenant gateway", description: "Enables or disables a tenant gateway for checkout." })
  @ApiParam({ name: "slug", example: "sslcommerz" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Gateway toggled.", data: { slug: "sslcommerz", is_active: true } } } })
  async toggleInstance(@Param("slug") slug: string) {
    return successResponse(await this.payments.toggleTenantActive(slug), "Gateway toggled.");
  }

  @Post("payments/gateways/:slug/sandbox")
  @RequireFeature("gateways", "edit")
  @ApiOperation({ summary: "Toggle tenant sandbox/live", description: "Switches the tenant gateway between sandbox and live." })
  @ApiParam({ name: "slug", example: "sslcommerz" })
  @ApiResponse({ status: 200, schema: { example: { success: true, message: "Gateway mode updated.", data: { slug: "sslcommerz", is_sandbox: false } } } })
  async toggleInstanceSandbox(@Param("slug") slug: string) {
    return successResponse(await this.payments.toggleTenantSandbox(slug), "Gateway mode updated.");
  }

  @Public()
  @Get("payments/available-gateways")
  @ApiOperation({
    summary: "Available gateways (public)",
    description: "Configured + active gateways for checkout. No auth required; used by the booking page.",
  })
  @ApiResponse({ status: 200, description: "Checkout gateway list.", schema: { example: EX_AVAILABLE } })
  async available() {
    return listSuccessResponse(await this.payments.available(true));
  }

  @Post("payments/initiate")
  @ApiOperation({
    summary: "Initiate payment",
    description: "Creates a `PaymentAttempt` with unique `tran_id` and returns `gateway_url` for redirect. Amount is re-validated server-side on callback.",
  })
  @ApiBody({
    schema: { example: { source_id: "01a0c095-151c-742e-98dc-3710cde36b60", gateway_slug: "stub", amount: "500000.00", currency: "BDT" } },
  })
  @ApiResponse({ status: 200, description: "Redirect URL.", schema: { example: EX_PAYMENT_INIT_RES } })
  @ApiResponse({ status: 401, schema: { example: ERR_UNAUTH } })
  async initiate(@Req() req: Request, @Body() body: { source_id: string; gateway_slug: string; amount: string; currency?: string }) {
    const forwarded = req.headers["x-forwarded-host"] ?? req.headers.host ?? getTenantStore()?.host ?? "localhost";
    const host = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return successResponse(
      await this.payments.initiate(body.source_id, body.gateway_slug, body.amount, body.currency ?? "BDT", host, (req as Request & { user: { id: string } }).user.id),
      "Payment initiated.",
    );
  }

  @Public()
  @Post("payments/ipn")
  @ApiOperation({
    summary: "Provider IPN/webhook",
    description: "Idempotent webhook entry. Duplicate/out-of-order events no-op on terminal attempts; provider event ids are unique.",
  })
  @ApiBody({ schema: { example: { tran_id: "TXN-01a0c095-01a0c095", val_id: "stub-TXN-01a0c095", card_type: "stub" } } })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Operation successful.", data: { tran_id: "TXN-01a0c095-01a0c095", status: "success" } } },
  })
  async ipn(@Req() req: Request) {
    const rawBody = (req.body ?? {}) as Record<string, any>;
    const query = (req.query ?? {}) as Record<string, string>;
    const body = { ...(rawBody as Record<string, string>), ...query };
    const stripeObj = rawBody?.data?.object;
    const tranId =
      body.tran_id ||
      body.client_reference_id ||
      stripeObj?.client_reference_id ||
      stripeObj?.metadata?.tran_id;
    const valId = body.val_id || body.session_id || stripeObj?.id;
    const eventId = rawBody.id || body.val_id || body.tran_id || valId;
    const gateway = rawBody?.type ? "stripe" : (body.card_type || body.gateway || "unknown");
    if (eventId) await this.payments.recordWebhook(String(eventId), gateway, rawBody);
    const attempt = await this.payments.handleCallback({
      tranId: tranId ? String(tranId) : undefined,
      valId: valId ? String(valId) : undefined,
      status: "success",
    });
    return successResponse({ tran_id: attempt.tranId, status: attempt.status });
  }

  @Public()
  @Get("payments/attempts/:tranId")
  @ApiOperation({ summary: "Payment attempt (public)", description: "Status and amount for a return page after gateway redirect. Identified by `tran_id` only." })
  @ApiParam({ name: "tranId", example: "TXN-01a0c095-01a0c095" })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, message: "Operation successful.", data: { tran_id: "TXN-01a0c095-01a0c095", status: "success", amount: "500000.00", currency: "BDT" } } },
  })
  async lookupAttempt(@Param("tranId") tranId: string) {
    return successResponse(await this.payments.lookupAttempt(tranId));
  }

  @Public()
  @All("payments/success")
  @ApiExcludeEndpoint()
  async success(@Req() req: Request, @Res() res: Response) {
    const q = { ...(req.body as Record<string, string>), ...(req.query as Record<string, string>) };
    return this.redirectAfterCallback(res, () =>
      this.payments.handleCallback({
        tranId: q.tran_id,
        valId: q.val_id || q.session_id,
        status: "success",
      }),
    );
  }

  @Public()
  @All("payments/fail")
  @ApiExcludeEndpoint()
  async fail(@Req() req: Request, @Res() res: Response) {
    const q = { ...(req.query as Record<string, string>), ...(req.body as Record<string, string>) };
    return this.redirectAfterCallback(res, () => this.payments.handleCallback({ tranId: q.tran_id, status: "failed" }), "failed");
  }

  @Public()
  @All("payments/cancel")
  @ApiExcludeEndpoint()
  async cancel(@Req() req: Request, @Res() res: Response) {
    const q = { ...(req.query as Record<string, string>), ...(req.body as Record<string, string>) };
    return this.redirectAfterCallback(res, () => this.payments.handleCallback({ tranId: q.tran_id, status: "cancelled" }), "cancelled");
  }

  private async redirectAfterCallback(
    res: Response,
    run: () => Promise<{ status: string; tranId: string }>,
    fallback: "failed" | "cancelled" = "failed",
  ) {
    try {
      const attempt = await run();
      return res.redirect(paymentReturnPath(attempt.status, attempt.tranId));
    } catch {
      return res.redirect(paymentReturnPath(fallback));
    }
  }
}

function paymentReturnPath(status: string, tranId?: string) {
  const q = new URLSearchParams();
  if (tranId) q.set("tran_id", tranId);
  if (status === "cancelled") q.set("reason", "cancelled");
  const query = q.toString() ? `?${q.toString()}` : "";
  return status === "success" ? `/portal/payments/success${query}` : `/portal/payments/fail${query}`;
}

void Query;
