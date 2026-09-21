import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { EntityManager, LockMode } from "@mikro-orm/postgresql";
import { ErrorCode } from "@wufud/contracts";
import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { Plan } from "./entities/plan.entity";
import { AgencySignup } from "./entities/agency-signup.entity";
import { TenantSubscription, SubscriptionInvoice } from "./entities/subscription.entity";
import { Tenant } from "../tenancy/entities/tenant.entity";
import { User } from "../identity/entities/user.entity";
import { ProvisioningService } from "../tenancy/provisioning.service";
import { AuthService, hashToken } from "../identity/auth.service";
import { PaymentsService } from "../payments/payments.service";
import { PaymentGatewayCatalog } from "../payments/entities/gateway-catalog.entity";
import { credentialsComplete } from "../payments/adapters/factory";
import { DomainError } from "../shared/errors/domain.error";
import { env } from "../shared/config/env";
import { webOriginForHost } from "../shared/config/web-origin";
import { assertAgencySlug, normalizeAgencySlug } from "../tenancy/agency-slug";
import { MailService } from "../mail/mail.service";

const PENDING_RESERVATION_MS = 2 * 3600 * 1000;
const EMAIL_VERIFY_MS = 48 * 3600 * 1000;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly em: EntityManager,
    private readonly provisioning: ProvisioningService,
    private readonly auth: AuthService,
    private readonly mail: MailService,
    @Inject(forwardRef(() => PaymentsService)) private readonly payments: PaymentsService,
  ) {}

  async listPublishedPlans() {
    const plans = await this.em.find(
      Plan,
      { isDeleted: false, isPublished: true },
      { orderBy: { sortOrder: "ASC" } },
    );
    return plans.map(publicPlan);
  }

  async slugStatus(raw: string) {
    const slug = normalizeAgencySlug(raw);
    try {
      assertAgencySlug(slug);
    } catch (err) {
      return { slug, available: false, reason: err instanceof DomainError ? err.message : "Invalid subdomain." };
    }
    const taken = await this.slugTaken(slug);
    return { slug, available: !taken, reason: taken ? "That subdomain is already taken." : undefined };
  }

  async billingGateways() {
    const rows = await this.em.find(PaymentGatewayCatalog, { isDeleted: false }, { orderBy: { sortOrder: "ASC" } });
    return rows
      .filter((row) => credentialsComplete(row.configSchema, row.platformCredentials))
      .map((row) => ({
        slug: row.slug,
        name: row.name,
        description: row.description,
        is_sandbox: row.isSandbox,
        is_configured: true,
      }));
  }

  async start(
    input: {
      agencyName: string;
      slug: string;
      fullName: string;
      email: string;
      password: string;
      planId: string;
      mode: "trial" | "paid";
      gatewaySlug?: string;
    },
    host: string,
  ) {
    const slug = normalizeAgencySlug(input.slug || input.agencyName);
    assertAgencySlug(slug);
    const email = input.email.toLowerCase().trim();
    const existingUser = await this.em.findOne(User, { email });
    if (existingUser) {
      throw DomainError.conflict("That email is already in use.", { email: ["That email is already in use."] });
    }
    if (!input.password || input.password.length < 8) {
      throw new DomainError(ErrorCode.VALIDATION_ERROR, "Password must be at least 8 characters.", 400, {
        password: ["Password must be at least 8 characters."],
      });
    }
    const plan = await this.em.findOne(Plan, { id: input.planId, isDeleted: false, isPublished: true });
    if (!plan) throw DomainError.notFound("That plan is not available.");
    const price = Number(plan.priceMonthly);
    if (input.mode === "paid" && price <= 0) {
      throw new DomainError(ErrorCode.VALIDATION_ERROR, "This plan is not billed online. Start a trial or contact us.", 400);
    }
    if (input.mode === "trial" && (plan.trialDays ?? 0) <= 0) {
      throw new DomainError(ErrorCode.VALIDATION_ERROR, "This plan does not include a trial. Choose a paid start.", 400);
    }

    const passwordHash = await argon2.hash(input.password);
    let trialPlainToken: string | undefined;

    const reserved = await this.em.transactional(async (em) => {
      await this.expireStaleSignups(em, slug);
      await this.lockSlug(em, slug);

      if (await em.findOne(Tenant, { slug })) {
        throw DomainError.conflict("That subdomain is already taken.", { slug: ["That subdomain is already taken."] });
      }

      const live = await this.findLivePendingSignup(em, slug);
      if (live) {
        throw DomainError.conflict("That subdomain is already being registered.", {
          slug: ["That subdomain is already being registered."],
        });
      }

      let signup = await em.findOne(AgencySignup, { slug }, { orderBy: { createdAt: "DESC" }, lockMode: LockMode.PESSIMISTIC_WRITE });
      if (signup?.status === "provisioned") {
        throw DomainError.conflict("That subdomain is already taken.", { slug: ["That subdomain is already taken."] });
      }

      const base = {
        agencyName: input.agencyName.trim(),
        slug,
        ownerEmail: email,
        ownerFullName: input.fullName.trim(),
        passwordHash,
        plan,
        mode: input.mode,
        status: "pending" as const,
        gatewaySlug: undefined,
        tranId: undefined,
        tenantId: undefined,
      };

      if (!signup) {
        signup = em.create(AgencySignup, base);
        em.persist(signup);
      } else {
        em.assign(signup, base);
      }

      if (input.mode === "trial") {
        trialPlainToken = randomBytes(24).toString("hex");
        signup.verifyTokenHash = hashToken(trialPlainToken);
        signup.verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFY_MS);
      } else {
        signup.verifyTokenHash = undefined;
        signup.verificationExpiresAt = new Date(Date.now() + PENDING_RESERVATION_MS);
      }

      await em.flush();
      return signup;
    });

    if (input.mode === "trial") {
      await this.sendVerificationEmail(reserved, trialPlainToken!);
      return {
        status: "pending_verification" as const,
        slug: reserved.slug,
        email: reserved.ownerEmail,
        ...devVerifyPayload(trialPlainToken!),
      };
    }

    if (!input.gatewaySlug) {
      throw new DomainError(ErrorCode.GATEWAY_UNAVAILABLE, "Choose a payment gateway.", 400);
    }
    const initiated = await this.payments.initiatePlatform(
      reserved.id,
      input.gatewaySlug,
      plan.priceMonthly,
      plan.currency,
      host,
    );
    await this.em.transactional(async (em) => {
      const signup = await em.findOne(AgencySignup, { id: reserved.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!signup) return;
      signup.gatewaySlug = input.gatewaySlug;
      signup.tranId = initiated.tran_id;
      await em.flush();
    });
    return { status: "pending_payment" as const, slug, ...initiated };
  }

  async confirmVerification(token: string) {
    if (!token?.trim()) {
      throw DomainError.notFound("This verification link is invalid or has expired.");
    }
    return this.em.transactional(async (em) => {
      const signup = await em.findOne(
        AgencySignup,
        { verifyTokenHash: hashToken(token.trim()), status: "pending", mode: "trial" },
        { populate: ["plan"], lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!signup || !signup.verificationExpiresAt || signup.verificationExpiresAt < new Date()) {
        throw DomainError.notFound("This verification link is invalid or has expired.");
      }
      await this.lockSlug(em, signup.slug);
      if (await em.findOne(Tenant, { slug: signup.slug })) {
        throw DomainError.conflict("That subdomain is already taken.", { slug: ["That subdomain is already taken."] });
      }
      signup.verifyTokenHash = undefined;
      const tenant = await this.fulfill(em, signup, "trial");
      return {
        status: "provisioned" as const,
        slug: tenant.slug,
        login_url: agencyLoginUrl(tenant.slug),
      };
    });
  }

  async completePaid(signupId: string) {
    await this.em.transactional(async (em) => {
      const signup = await em.findOne(AgencySignup, { id: signupId }, { populate: ["plan"], lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!signup || signup.status === "provisioned") return;
      if (signup.status !== "pending" || signup.mode !== "paid") return;
      await this.expireStaleSignups(em, signup.slug);
      if (signup.verificationExpiresAt && signup.verificationExpiresAt < new Date()) {
        signup.status = "expired";
        await em.flush();
        return;
      }
      await this.lockSlug(em, signup.slug);
      if (await em.findOne(Tenant, { slug: signup.slug })) {
        signup.status = "failed";
        await em.flush();
        return;
      }
      await this.fulfill(em, signup, "paid");
    });
  }

  async lookupSignupByTranId(tranId: string) {
    return this.em.findOne(AgencySignup, { tranId });
  }

  private async fulfill(em: EntityManager, signup: AgencySignup, kind: "trial" | "paid") {
    const plan = signup.plan;
    const tenant = await this.provisioning.provision(
      {
        name: signup.agencyName,
        slug: signup.slug,
        ownerEmail: signup.ownerEmail,
        plan: plan.slug,
        status: kind === "trial" ? "trial" : "active",
        features: Object.fromEntries((plan.features ?? []).map((k) => [k, true])),
        maxUsers: plan.maxUsers,
        maxBranches: plan.maxBranches,
      },
      em,
    );
    const start = new Date();
    const end = new Date(start);
    if (kind === "trial") end.setDate(end.getDate() + Math.max(plan.trialDays || 14, 1));
    else end.setMonth(end.getMonth() + 1);
    const sub = em.create(TenantSubscription, {
      tenant,
      plan,
      status: kind === "trial" ? "trialing" : "active",
      currentPeriodStart: start,
      currentPeriodEnd: end,
    });
    em.persist(sub);
    if (kind === "paid") {
      em.create(SubscriptionInvoice, {
        subscription: sub,
        amount: plan.priceMonthly,
        currency: plan.currency,
        status: "paid",
        paidAt: start,
      });
    }
    await this.auth.createOwnerFromHash(
      {
        tenant,
        email: signup.ownerEmail,
        fullName: signup.ownerFullName,
        passwordHash: signup.passwordHash,
      },
      em,
    );
    signup.status = "provisioned";
    signup.tenantId = tenant.id;
    signup.verifyTokenHash = undefined;
    signup.verificationExpiresAt = undefined;
    await em.flush();
    return tenant;
  }

  private async lockSlug(em: EntityManager, slug: string) {
    await em.getConnection().execute(`SELECT pg_advisory_xact_lock(hashtextextended(?::text, 0))`, [slug]);
  }

  private async expireStaleSignups(em: EntityManager, slug?: string) {
    const now = new Date();
    const pending = await em.find(AgencySignup, {
      ...(slug ? { slug } : {}),
      status: "pending",
    });
    for (const row of pending) {
      const expiresAt =
        row.verificationExpiresAt ??
        new Date(row.createdAt.getTime() + PENDING_RESERVATION_MS);
      if (expiresAt < now) {
        row.status = "expired";
        row.verifyTokenHash = undefined;
      }
    }
    await em.flush();
  }

  private async findLivePendingSignup(em: EntityManager, slug: string) {
    const signup = await em.findOne(AgencySignup, { slug, status: "pending" });
    if (!signup) return null;
    const expiresAt =
      signup.verificationExpiresAt ?? new Date(signup.createdAt.getTime() + PENDING_RESERVATION_MS);
    return expiresAt >= new Date() ? signup : null;
  }

  private async slugTaken(slug: string) {
    if (await this.em.findOne(Tenant, { slug })) return true;
    return Boolean(await this.findLivePendingSignup(this.em, slug));
  }

  private async sendVerificationEmail(signup: AgencySignup, token: string) {
    const verifyUrl = `${webOriginForHost(env.PLATFORM_HOST)}/start/verify?token=${encodeURIComponent(token)}`;
    const hours = Math.round(EMAIL_VERIFY_MS / 3600000);
    try {
      await this.mail.send({
        plane: "platform",
        to: signup.ownerEmail,
        subject: `Verify your email to activate ${signup.agencyName} on Wufud`,
        text: [
          `Confirm your email to create ${signup.agencyName} at ${signup.slug}.${env.PLATFORM_HOST}.`,
          `Open this link within ${hours} hours: ${verifyUrl}`,
          "Your workspace is not created until you verify this email.",
        ].join("\n\n"),
        html: `<p>Confirm your email to create <strong>${escapeHtml(signup.agencyName)}</strong> at <code>${escapeHtml(signup.slug)}.${escapeHtml(env.PLATFORM_HOST)}</code>.</p>
<p><a href="${verifyUrl}">Verify email and create workspace</a></p>
<p>Your workspace is not created until you verify. This link expires in ${hours} hours.</p>
<p><code>${verifyUrl}</code></p>`,
      });
    } catch {
      /* signup stays pending; user can request resend later */
    }
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function devVerifyPayload(token: string) {
  if (env.NODE_ENV === "production") return {};
  return { verify_url: `${webOriginForHost(env.PLATFORM_HOST)}/start/verify?token=${encodeURIComponent(token)}` };
}

export function publicPlan(plan: Plan) {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    priceMonthly: plan.priceMonthly,
    currency: plan.currency,
    features: plan.features,
    maxUsers: plan.maxUsers,
    maxBranches: plan.maxBranches,
    trialDays: plan.trialDays,
    sortOrder: plan.sortOrder,
  };
}

export function agencyLoginUrl(slug: string) {
  return `${webOriginForHost(`${slug}.${env.PLATFORM_HOST}`)}/login`;
}
