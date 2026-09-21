import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { Tenant } from "../tenancy/entities/tenant.entity";
import { Plan } from "./entities/plan.entity";
import { TenantSubscription } from "./entities/subscription.entity";
import { TenantFeatureOverride } from "./entities/feature-override.entity";
import { PlatformDomain } from "../tenancy/entities/platform-domain.entity";
import { PlatformSeoSettings, PlatformAuditLog } from "./entities/seo-settings.entity";
import { User } from "../identity/entities/user.entity";
import { ProvisioningService } from "../tenancy/provisioning.service";
import { AuthService } from "../identity/auth.service";
import { ListQueryDto } from "../shared/dto/list-query.dto";
import { paginate } from "../shared/pagination/cursor.paginator";
import { DomainError } from "../shared/errors/domain.error";
import { PACKAGE_GATED_KEYS } from "@wufud/contracts";

@Injectable()
export class PlatformService {
  constructor(
    private readonly em: EntityManager,
    private readonly provisioning: ProvisioningService,
    private readonly auth: AuthService,
  ) {}

  async listTenants(query: ListQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.search) where.name = { $ilike: `%${query.search}%` };
    const page = await paginate(this.em, Tenant, where, { cursor: query.cursor, pageSize: query.page_size });
    const items = await Promise.all(
      page.items.map(async (t) => {
        let userCount: number | null = null;
        try {
          userCount = await this.em.count(User, { tenant: (t as Tenant).id, isDeleted: false });
        } catch {
          userCount = null;
        }
        return { ...(t as object), userCount };
      }),
    );
    return { items, pagination: page.pagination };
  }

  async createTenant(
    body: { name: string; slug: string; ownerEmail?: string; plan?: string; trialDays?: number; invitationExpiresHours?: number },
    actor?: User,
  ) {
    const plan = body.plan ? await this.em.findOne(Plan, { slug: body.plan, isDeleted: false }) : null;
    const trialDays = body.trialDays ?? plan?.trialDays ?? 14;
    const tenant = await this.provisioning.provision({
      name: body.name,
      slug: body.slug,
      ownerEmail: body.ownerEmail,
      plan: plan?.slug ?? body.plan,
      status: trialDays > 0 ? "trial" : "active",
      features: plan ? Object.fromEntries((plan.features ?? []).map((k) => [k, true])) : undefined,
      maxUsers: plan?.maxUsers,
      maxBranches: plan?.maxBranches,
    });
    if (plan) {
      const start = new Date();
      const end = new Date(start);
      if (trialDays > 0) end.setDate(end.getDate() + trialDays);
      else end.setMonth(end.getMonth() + 1);
      this.em.create(TenantSubscription, {
        tenant,
        plan,
        status: trialDays > 0 ? "trialing" : "active",
        currentPeriodStart: start,
        currentPeriodEnd: end,
      });
      await this.em.flush();
    }
    let invitationEmailSent = false;
    let invitationToken: string | undefined;
    if (body.ownerEmail) {
      const invited = await this.auth.invite({
        email: body.ownerEmail,
        type: "tenant_owner",
        tenantId: tenant.id,
        invitedById: actor?.id,
        metadata: { role_slug: "admin" },
        plane: "platform",
        expiresInHours: body.invitationExpiresHours ?? plan?.invitationExpiresHours,
      });
      invitationEmailSent = invited.emailSent;
      invitationToken = invited.token;
    }
    await this.audit(actor?.id, "tenant.create", "tenant", tenant.id);
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      schemaName: tenant.schemaName,
      status: tenant.status,
      invitation_email_sent: invitationEmailSent,
      invitation_token: invitationToken,
    };
  }

  async setStatus(id: string, status: Tenant["status"], actor?: User) {
    const tenant = await this.em.findOneOrFail(Tenant, { id });
    tenant.status = status;
    tenant.isEnabled = status === "active" || status === "trial";
    await this.em.flush();
    await this.audit(actor?.id, "tenant.status", "tenant", id, { status });
    return tenant;
  }

  async tenantStats(id: string) {
    const tenant = await this.em.findOneOrFail(Tenant, { id });
    const users = await this.em.count(User, { tenant: id, isDeleted: false });
    return { tenant_id: tenant.id, slug: tenant.slug, users };
  }

  listPlans(query: ListQueryDto) {
    return paginate(this.em, Plan, {}, { cursor: query.cursor, pageSize: query.page_size });
  }

  async upsertPlan(data: Partial<Plan>) {
    if (data.id) {
      const plan = await this.em.findOneOrFail(Plan, { id: data.id });
      this.em.assign(plan, data);
      await this.em.flush();
      return plan;
    }
    const plan = this.em.create(Plan, { isPublished: true, ...(data as Plan) });
    await this.em.persistAndFlush(plan);
    return plan;
  }

  async setFeature(tenantId: string, featureKey: string, enabled: boolean) {
    let row = await this.em.findOne(TenantFeatureOverride, { tenant: tenantId, featureKey });
    if (!row) {
      row = this.em.create(TenantFeatureOverride, {
        tenant: tenantId,
        featureKey,
        enabled,
      });
      this.em.persist(row);
    } else {
      row.enabled = enabled;
    }
    await this.em.flush();
    return row;
  }

  async getTenantFeatures(tenantId: string) {
    const tenant = await this.em.findOneOrFail(Tenant, { id: tenantId });
    const baseline = tenant.features ?? {};
    const overrides = await this.em.find(TenantFeatureOverride, { tenant: tenantId });
    const overrideMap = Object.fromEntries(overrides.map((o) => [o.featureKey, o.enabled]));
    const effective: Record<string, boolean> = {};
    for (const key of PACKAGE_GATED_KEYS) {
      effective[key] = overrideMap[key] ?? baseline[key] ?? false;
    }
    return {
      tenant_id: tenant.id,
      plan: tenant.plan ?? null,
      max_users: tenant.maxUsers,
      max_branches: tenant.maxBranches,
      baseline,
      overrides: overrideMap,
      effective,
      enabled: Object.entries(effective)
        .filter(([, v]) => v)
        .map(([k]) => k),
    };
  }

  async syncTenantFeatures(tenantId: string, desired: Record<string, boolean>) {
    const tenant = await this.em.findOneOrFail(Tenant, { id: tenantId });
    const baseline = tenant.features ?? {};
    for (const key of PACKAGE_GATED_KEYS) {
      if (!(key in desired)) continue;
      const want = Boolean(desired[key]);
      const base = Boolean(baseline[key]);
      const row = await this.em.findOne(TenantFeatureOverride, { tenant: tenantId, featureKey: key });
      if (want === base) {
        if (row) this.em.remove(row);
      } else if (row) {
        row.enabled = want;
      } else {
        this.em.create(TenantFeatureOverride, { tenant: tenantId, featureKey: key, enabled: want });
      }
    }
    await this.em.flush();
    return this.getTenantFeatures(tenantId);
  }

  async domains() {
    return this.em.find(PlatformDomain, { isDeleted: false });
  }

  async addDomain(host: string, isPrimary = false) {
    const existing = await this.em.findOne(PlatformDomain, { host: host.toLowerCase() });
    if (existing) throw DomainError.conflict("That host is already in use.");
    if (isPrimary) {
      const current = await this.em.find(PlatformDomain, { isPrimary: true });
      for (const d of current) d.isPrimary = false;
    }
    const domain = this.em.create(PlatformDomain, { host: host.toLowerCase(), isPrimary });
    await this.em.persistAndFlush(domain);
    return domain;
  }

  async getSeo() {
    return (await this.em.findOne(PlatformSeoSettings, {})) ?? this.em.create(PlatformSeoSettings, { title: "Wufud" });
  }

  async saveSeo(data: Partial<PlatformSeoSettings>) {
    const seo = await this.getSeo();
    this.em.assign(seo, data);
    await this.em.persistAndFlush(seo);
    return seo;
  }

  async auditLog(query: ListQueryDto) {
    return paginate(this.em, PlatformAuditLog, {}, { cursor: query.cursor, pageSize: query.page_size });
  }

  async billingOverview() {
    const tenants = await this.em.count(Tenant, { isDeleted: false });
    const plans = await this.em.count(Plan, { isDeleted: false });
    const assigned = await this.em.count(TenantSubscription, { status: "active" });
    return { tenants, plans, on_plan: assigned, unassigned: Math.max(tenants - assigned, 0) };
  }

  async subscribe(tenantId: string, planId: string) {
    const tenant = await this.em.findOneOrFail(Tenant, { id: tenantId });
    const plan = await this.em.findOneOrFail(Plan, { id: planId });
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    const sub = this.em.create(TenantSubscription, {
      tenant,
      plan,
      status: "active",
      currentPeriodStart: start,
      currentPeriodEnd: end,
    });
    tenant.plan = plan.slug;
    tenant.features = Object.fromEntries((plan.features ?? []).map((k) => [k, true]));
    tenant.maxUsers = plan.maxUsers;
    tenant.maxBranches = plan.maxBranches;
    await this.em.persistAndFlush(sub);
    return sub;
  }

  private async audit(actorId: string | undefined, action: string, targetType: string, targetId?: string, metadata?: Record<string, unknown>) {
    this.em.create(PlatformAuditLog, { actorId, action, targetType, targetId, metadata });
    await this.em.flush();
  }
}
