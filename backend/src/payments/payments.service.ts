import { LockMode } from "@mikro-orm/core";
import { receivePayment } from "../booking/receive-payment";
import { positiveMoney } from "../shared/validation/business";
import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { ErrorCode } from "@wufud/contracts";
import { DomainError } from "../shared/errors/domain.error";
import { PaymentGatewayCatalog } from "./entities/gateway-catalog.entity";
import { TenantGatewayInstance } from "./entities/tenant-gateway.entity";
import { PaymentAttempt, PlatformPaymentAttempt, WebhookEvent } from "./entities/payment-attempt.entity";
import { credentialsComplete, getGateway } from "./adapters/factory";
import { randomBytes } from "node:crypto";
import { Booking, BookingPilgrim } from "../booking/entities/booking.entity";
import { User } from "../identity/entities/user.entity";
import { Payment } from "../accounts/entities/payment.entity";
import { getTenantStore } from "../tenancy/tenant-context";
import { env } from "../shared/config/env";
import { OnboardingService, agencyLoginUrl } from "../platform/onboarding.service";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly em: EntityManager,
    @Inject(forwardRef(() => OnboardingService)) private readonly onboarding: OnboardingService,
  ) {}

  async listCatalog() {
    return this.em.find(PaymentGatewayCatalog, { isDeleted: false }, { orderBy: { sortOrder: "ASC" } });
  }

  async listPublicCatalog() {
    const rows = await this.listCatalog();
    return rows.map((row) => this.publicCatalog(row));
  }

  async saveCatalog(data: Partial<PaymentGatewayCatalog>) {
    if (data.slug) {
      const row = await this.em.findOne(PaymentGatewayCatalog, { slug: data.slug });
      if (row) {
        const merged = { ...(row.platformCredentials ?? {}) };
        for (const [k, v] of Object.entries(data.platformCredentials ?? {})) {
          if (String(v).trim()) merged[k] = String(v);
        }
        const { platformCredentials: _creds, isDefault: _default, ...rest } = data;
        this.em.assign(row, { ...rest, platformCredentials: merged });
        await this.em.flush();
        return this.publicCatalog(row);
      }
    }
    const row = this.em.create(PaymentGatewayCatalog, data as PaymentGatewayCatalog);
    await this.em.persistAndFlush(row);
    return this.publicCatalog(row);
  }

  async toggleCatalog(slug: string) {
    const row = await this.em.findOneOrFail(PaymentGatewayCatalog, { slug });
    row.isEnabledForTenants = !row.isEnabledForTenants;
    await this.em.flush();
    return this.publicCatalog(row);
  }

  async toggleCatalogSandbox(slug: string) {
    const row = await this.em.findOneOrFail(PaymentGatewayCatalog, { slug });
    row.isSandbox = !row.isSandbox;
    await this.em.flush();
    return this.publicCatalog(row);
  }

  async tenantInstances() {
    const catalog = await this.em.find(PaymentGatewayCatalog, { isEnabledForTenants: true, isDeleted: false }, { orderBy: { sortOrder: "ASC" } });
    const instances = await this.em.find(TenantGatewayInstance, { isDeleted: false });
    const bySlug = new Map(instances.map((i) => [i.gatewaySlug, i]));
    return catalog.map((c) => {
      const inst = bySlug.get(c.slug);
      return {
        slug: c.slug,
        name: c.name,
        description: c.description,
        config_schema: c.configSchema,
        is_configured: Boolean(inst && credentialsComplete(c.configSchema, inst.credentials)),
        is_sandbox: inst?.isSandbox ?? true,
        is_active: inst?.isGatewayActive ?? false,
      };
    });
  }

  async saveTenantInstance(slug: string, body: { credentials?: Record<string, string>; isSandbox?: boolean; isActive?: boolean }) {
    const catalog = await this.requireTenantCatalog(slug);
    let inst = await this.em.findOne(TenantGatewayInstance, { gatewaySlug: slug });
    const merged = { ...(inst?.credentials ?? {}) };
    for (const [k, v] of Object.entries(body.credentials ?? {})) {
      if (String(v).trim()) merged[k] = String(v);
    }
    if (!inst) {
      inst = this.em.create(TenantGatewayInstance, {
        gatewaySlug: slug,
        credentials: merged,
        isSandbox: body.isSandbox ?? true,
        isGatewayActive: body.isActive ?? false,
      });
      this.em.persist(inst);
    } else {
      inst.credentials = merged;
      if (body.isSandbox !== undefined) inst.isSandbox = body.isSandbox;
      if (body.isActive !== undefined) inst.isGatewayActive = body.isActive;
    }
    await this.em.flush();
    return this.publicTenantInstance(catalog, inst);
  }

  async toggleTenantActive(slug: string) {
    const catalog = await this.requireTenantCatalog(slug);
    const inst = await this.ensureTenantInstance(slug);
    inst.isGatewayActive = !inst.isGatewayActive;
    await this.em.flush();
    return this.publicTenantInstance(catalog, inst);
  }

  async toggleTenantSandbox(slug: string) {
    const catalog = await this.requireTenantCatalog(slug);
    const inst = await this.ensureTenantInstance(slug);
    inst.isSandbox = !inst.isSandbox;
    await this.em.flush();
    return this.publicTenantInstance(catalog, inst);
  }

  async available(publicView = false) {
    const rows = await this.tenantInstances();
    return rows
      .filter((r) => r.is_configured && r.is_active)
      .map((r) =>
        publicView
          ? { slug: r.slug, name: r.name, description: r.description, is_sandbox: r.is_sandbox, is_configured: true }
          : r,
      );
  }

  async initiate(sourceId: string, gatewaySlug: string, amount: string, currency: string, host: string, userId?: string) {
    positiveMoney(amount);
    const booking = await this.em.findOneOrFail(Booking, { id: sourceId, userId });
    if (!userId || booking.currency !== currency || booking.status === "cancelled") throw DomainError.forbidden("Payment must belong to your active booking and use its currency.");
    if (!gatewaySlug) throw new DomainError(ErrorCode.GATEWAY_UNAVAILABLE, "Choose a payment gateway.", 400);
    const catalog = await this.em.findOne(PaymentGatewayCatalog, { slug: gatewaySlug });
    if (!catalog?.isEnabledForTenants) throw new DomainError(ErrorCode.GATEWAY_UNAVAILABLE, undefined, 400);
    const inst = await this.em.findOne(TenantGatewayInstance, { gatewaySlug, isGatewayActive: true });
    if (!inst || !credentialsComplete(catalog.configSchema, inst.credentials)) {
      throw new DomainError(ErrorCode.GATEWAY_UNAVAILABLE, "Gateway is not configured.", 400, {
        missing_fields: catalog.configSchema.filter((f) => f.required && !inst?.credentials?.[f.key]).map((f) => f.key),
      });
    }
    const tranId = `TXN-${randomBytes(12).toString("hex")}`;
    const attempt = this.em.create(PaymentAttempt, {
      tranId,
      gatewaySlug,
      amount,
      currency,
      status: "init",
      sourceRef: sourceId,
    });
    const urls = this.callbackUrls(host);
    const pilgrim = await this.em.findOne(BookingPilgrim, { booking: booking.id }, { orderBy: { createdAt: "ASC" } });
    const user = userId ? await this.em.findOne(User, { id: userId }) : null;
    try {
      const gw = getGateway(gatewaySlug, inst.credentials ?? {}, inst.isSandbox, urls);
      const result = await gw.initiate({
        tranId,
        amount,
        currency,
        sourceRef: sourceId,
        customerName: pilgrim?.fullName || user?.fullName || "Pilgrim",
        customerEmail: user?.email,
        customerPhone: user?.phone,
      });
      attempt.status = "pending";
      attempt.gatewayResponse = result.raw;
      attempt.valId = String(result.raw.id ?? "");
      await this.em.persistAndFlush(attempt);
      return { gateway_url: result.gateway_url, tran_id: tranId, gateway_slug: gatewaySlug };
    } catch (err) {
      attempt.status = "failed";
      attempt.gatewayResponse = { error: (err as Error).message };
      await this.em.persistAndFlush(attempt);
      throw new DomainError(
        ErrorCode.GATEWAY_UNAVAILABLE,
        (err as Error).message || "Payment gateway could not initiate payment.",
        502,
      );
    }
  }

  async initiatePlatform(sourceId: string, gatewaySlug: string, amount: string, currency: string, host: string) {
    if (!gatewaySlug) throw new DomainError(ErrorCode.GATEWAY_UNAVAILABLE, "Choose a payment gateway.", 400);
    const catalog = await this.em.findOne(PaymentGatewayCatalog, { slug: gatewaySlug });
    if (!catalog || !credentialsComplete(catalog.configSchema, catalog.platformCredentials)) {
      throw new DomainError(ErrorCode.GATEWAY_UNAVAILABLE, "Gateway is not configured.", 400);
    }
    const tranId = `SUB-${randomBytes(12).toString("hex")}`;
    const attempt = this.em.create(PlatformPaymentAttempt, {
      tranId,
      gatewaySlug,
      amount,
      currency,
      status: "init",
      sourceRef: sourceId,
    });
    const urls = this.callbackUrls(host);
    try {
      const gw = getGateway(gatewaySlug, catalog.platformCredentials ?? {}, catalog.isSandbox, urls);
      const result = await gw.initiate({ tranId, amount, currency, sourceRef: sourceId });
      attempt.status = "pending";
      attempt.gatewayResponse = result.raw;
      attempt.valId = String(result.raw.id ?? "");
      await this.em.persistAndFlush(attempt);
      return { gateway_url: result.gateway_url, tran_id: tranId, gateway_slug: gatewaySlug };
    } catch (err) {
      attempt.status = "failed";
      attempt.gatewayResponse = { error: (err as Error).message };
      await this.em.persistAndFlush(attempt);
      throw err;
    }
  }

  async handleCallback(input: { tranId?: string; valId?: string; status?: "success" | "failed" | "cancelled" }) {
    if (!input.tranId) throw DomainError.notFound();
    const platform = await this.em.findOne(PlatformPaymentAttempt, { tranId: input.tranId });
    if (platform) return this.finishPlatform(platform, input);
    if (getTenantStore()?.plane !== "tenant") throw DomainError.notFound();
    const attempt = await this.em.findOne(PaymentAttempt, { tranId: input.tranId });
    if (!attempt) throw DomainError.notFound();
    return this.finishTenant(attempt, input);
  }

  async lookupAttempt(tranId: string) {
    const platform = await this.em.findOne(PlatformPaymentAttempt, { tranId });
    if (platform) {
      const signup = await this.onboarding.lookupSignupByTranId(tranId);
      return {
        tran_id: platform.tranId,
        status: platform.status,
        amount: platform.amount,
        currency: platform.currency,
        gateway_slug: platform.gatewaySlug,
        gateway_name: (await this.em.findOne(PaymentGatewayCatalog, { slug: platform.gatewaySlug }))?.name ?? platform.gatewaySlug,
        kind: "subscription" as const,
        agency_slug: signup?.slug,
        agency_name: signup?.agencyName,
        login_url: signup?.status === "provisioned" && signup.slug ? agencyLoginUrl(signup.slug) : undefined,
      };
    }
    if (getTenantStore()?.plane !== "tenant") throw DomainError.notFound();
    const attempt = await this.em.findOne(PaymentAttempt, { tranId });
    if (!attempt) throw DomainError.notFound();
    const catalog = await this.em.findOne(PaymentGatewayCatalog, { slug: attempt.gatewaySlug });
    return {
      tran_id: attempt.tranId,
      status: attempt.status,
      amount: attempt.amount,
      currency: attempt.currency,
      gateway_slug: attempt.gatewaySlug,
      gateway_name: catalog?.name ?? attempt.gatewaySlug,
      kind: "booking" as const,
    };
  }

  async recordWebhook(providerEventId: string, gatewaySlug: string, payload: Record<string, unknown>) {
    return this.em.upsert(WebhookEvent, { providerEventId, gatewaySlug, payload }, { onConflictFields: ["providerEventId"], onConflictAction: "ignore" });
  }

  private async markSourcePaid(attempt: PaymentAttempt, em: EntityManager) {
    const booking = await em.findOneOrFail(Booking, { id: attempt.sourceRef }, { lockMode: LockMode.PESSIMISTIC_WRITE, filters: { softDelete: false } });
    await receivePayment(em, booking, Number(attempt.amount));
    em.create(Payment, { booking, source: "gateway", amount: attempt.amount, currency: attempt.currency, gatewaySlug: attempt.gatewaySlug, tranId: attempt.tranId });
  }

  private async finishTenant(
    attempt: PaymentAttempt,
    input: { tranId?: string; valId?: string; status?: "success" | "failed" | "cancelled" },
  ) {
    return this.em.transactional(async em => {
      attempt = await em.findOneOrFail(PaymentAttempt, { id: attempt.id }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
    if (attempt.status === "success") return attempt;
    if (input.status === "failed" || input.status === "cancelled") {
      attempt.status = input.status;
      await em.flush();
      return attempt;
    }
    const inst = await em.findOne(TenantGatewayInstance, { gatewaySlug: attempt.gatewaySlug });
    const urls = this.callbackUrls(getTenantStore()?.host ?? env.PLATFORM_HOST);
    const gw = getGateway(
      attempt.gatewaySlug,
      inst?.credentials ?? {},
      inst?.isSandbox ?? true,
      urls,
    );
    const valId = input.valId || attempt.valId || "";
    if ((attempt.gatewaySlug === "stripe" || attempt.gatewaySlug === "stub") && valId !== attempt.valId) {
      throw DomainError.forbidden("Payment session does not match this attempt.");
    }
    const validation = valId
      ? await gw.validate(valId)
      : { status: "FAILED" as const, amount: 0, currency: attempt.currency, raw: {} };
    const stored = Number(attempt.amount);
    const ok = validation.status === "VALID" && validation.currency === attempt.currency && (attempt.gatewaySlug === "stub" && env.NODE_ENV !== "production" || Math.round(validation.amount * 100) === Math.round(stored * 100)) && (attempt.gatewaySlug === "stripe" ? valId === attempt.valId : attempt.gatewaySlug === "stub" ? valId === attempt.valId : validation.raw.tran_id === attempt.tranId);
    attempt.status = ok ? "success" : "failed";
    attempt.validatedAt = new Date();
    // Never replace the trusted checkout session with an unverified callback ID.
    if (ok) attempt.valId = valId;
    attempt.gatewayResponse = validation.raw;
    if (ok) await this.markSourcePaid(attempt, em);
    await em.flush();
    return attempt;
    });
  }

  private async finishPlatform(
    attempt: PlatformPaymentAttempt,
    input: { tranId?: string; valId?: string; status?: "success" | "failed" | "cancelled" },
  ) {
    const result = await this.em.transactional(async em => {
      attempt = await em.findOneOrFail(PlatformPaymentAttempt, { id: attempt.id }, { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true });
    if (attempt.status === "success") return attempt;
    if (input.status === "failed" || input.status === "cancelled") {
      attempt.status = input.status;
      await em.flush();
      return attempt;
    }
    const catalog = await em.findOne(PaymentGatewayCatalog, { slug: attempt.gatewaySlug });
    const urls = this.callbackUrls(getTenantStore()?.host ?? env.PLATFORM_HOST);
    const gw = getGateway(attempt.gatewaySlug, catalog?.platformCredentials ?? {}, catalog?.isSandbox ?? true, urls);
    const valId = input.valId || attempt.valId || "";
    if ((attempt.gatewaySlug === "stripe" || attempt.gatewaySlug === "stub") && valId !== attempt.valId) {
      throw DomainError.forbidden("Payment session does not match this attempt.");
    }
    const validation = valId
      ? await gw.validate(valId)
      : { status: "FAILED" as const, amount: 0, currency: attempt.currency, raw: {} };
    const stored = Number(attempt.amount);
    const ok = validation.status === "VALID" && validation.currency === attempt.currency && (attempt.gatewaySlug === "stub" && env.NODE_ENV !== "production" || Math.round(validation.amount * 100) === Math.round(stored * 100)) && (attempt.gatewaySlug === "stripe" || attempt.gatewaySlug === "stub" ? valId === attempt.valId : validation.raw.tran_id === attempt.tranId);
    attempt.status = ok ? "success" : "failed";
    attempt.validatedAt = new Date();
    // Never replace the trusted checkout session with an unverified callback ID.
    if (ok) attempt.valId = valId;
    attempt.gatewayResponse = validation.raw;
    await em.flush();

    return attempt;
    });
    if (result.status === "success") await this.onboarding.completePaid(result.sourceRef);
    return result;
  }

  private callbackUrls(host: string) {
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;
    return {
      success_url: `${origin}/api/v1/payments/success`,
      fail_url: `${origin}/api/v1/payments/fail`,
      cancel_url: `${origin}/api/v1/payments/cancel`,
      ipn_url: `${origin}/api/v1/payments/ipn`,
    };
  }

  private async requireTenantCatalog(slug: string) {
    const row = await this.em.findOne(PaymentGatewayCatalog, { slug, isEnabledForTenants: true });
    if (!row) throw new DomainError(ErrorCode.GATEWAY_UNAVAILABLE, undefined, 400);
    return row;
  }

  private async ensureTenantInstance(slug: string) {
    let inst = await this.em.findOne(TenantGatewayInstance, { gatewaySlug: slug });
    if (inst) return inst;
    inst = this.em.create(TenantGatewayInstance, {
      gatewaySlug: slug,
      credentials: {},
      isSandbox: true,
      isGatewayActive: false,
    });
    this.em.persist(inst);
    return inst;
  }

  private publicTenantInstance(catalog: PaymentGatewayCatalog, inst: TenantGatewayInstance) {
    return {
      slug: inst.gatewaySlug,
      is_configured: credentialsComplete(catalog.configSchema, inst.credentials),
      is_sandbox: inst.isSandbox,
      is_active: inst.isGatewayActive,
    };
  }

  private publicCatalog(row: PaymentGatewayCatalog) {
    return {
      slug: row.slug,
      name: row.name,
      description: row.description,
      is_enabled_for_tenants: row.isEnabledForTenants,
      config_schema: row.configSchema,
      has_credentials: credentialsComplete(row.configSchema, row.platformCredentials),
      is_sandbox: row.isSandbox,
    };
  }
}
