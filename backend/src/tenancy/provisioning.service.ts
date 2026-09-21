import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { PACKAGE_GATED_KEYS, PERMISSION_KEYS, SYSTEM_TENANT_ROLES } from "@wufud/contracts";
import { Tenant, type TenantStatus } from "./entities/tenant.entity";
import { Domain } from "./entities/domain.entity";
import { Role } from "../access/entities/role.entity";
import { RolePermission } from "../access/entities/role-permission.entity";
import { Branch } from "../access/entities/branch.entity";
import { TenantSettings } from "../accounts/entities/reconciliation.entity";
import { env } from "../shared/config/env";
import { TENANT_DDL } from "./tenant-ddl";
import { assertAgencySlug, normalizeAgencySlug } from "./agency-slug";
import { DomainError } from "../shared/errors/domain.error";

const ROLE_MATRIX: Record<string, Record<string, "view" | "edit" | "full">> = {
  admin: Object.fromEntries([...PERMISSION_KEYS].map((k) => [k, "full"])),
  manager: {
    dashboard: "view",
    packages: "edit",
    bookings: "edit",
    pilgrims: "edit",
    users: "view",
    branches: "view",
    payments: "edit",
    refunds: "edit",
    accounts: "view",
    vendors: "view",
    disbursements: "view",
    stock: "view",
    expenses: "view",
    settlements: "view",
    pos: "view",

    reports: "view",
    audit: "view",
    permissions: "view",
    gateways: "view",
    domains: "view",
    seo: "edit",
    email: "edit",
    general_settings: "edit",
  },
  branch_manager: {
    dashboard: "view",
    packages: "edit",
    bookings: "edit",
    pilgrims: "edit",
    users: "view",
    branches: "view",
    payments: "edit",
    refunds: "view",
    accounts: "view",
    vendors: "view",
    disbursements: "view",
    stock: "view",
    expenses: "view",
    settlements: "view",
    pos: "view",

    reports: "view",
    audit: "view",
  },
  accountant: {
    dashboard: "view",
    bookings: "view",
    payments: "full",
    refunds: "full",
    accounts: "full",
    vendors: "full",
    disbursements: "full",
    stock: "full",
    expenses: "full",
    settlements: "full",
    pos: "full",

    reports: "full",
    audit: "view",
  },
  agent: {
    dashboard: "view",
    packages: "view",
    bookings: "edit",
    pilgrims: "edit",
    payments: "edit",
  },
  viewer: {
    dashboard: "view",
    packages: "view",
    bookings: "view",
    reports: "view",
    audit: "view",
  },
  pilgrim: {
    bookings: "view",
    payments: "view",
  },
};

@Injectable()
export class ProvisioningService {
  constructor(private readonly em: EntityManager) {}

  async provision(
    input: {
      name: string;
      slug: string;
      ownerEmail?: string;
      plan?: string;
      status?: TenantStatus;
      features?: Record<string, boolean>;
      maxUsers?: number;
      maxBranches?: number;
    },
    em: EntityManager = this.em,
  ): Promise<Tenant> {
    const slug = normalizeAgencySlug(input.slug);
    assertAgencySlug(slug);
    const taken = await em.findOne(Tenant, { slug });
    if (taken) throw DomainError.conflict("That subdomain is already taken.", { slug: ["That subdomain is already taken."] });
    const schemaName = `t_${slug.replace(/-/g, "_")}`;
    const tenant = em.create(Tenant, {
      name: input.name,
      slug,
      schemaName,
      status: input.status ?? "trial",
      plan: input.plan ?? "starter",
      ownerEmail: input.ownerEmail,
      features: input.features ?? Object.fromEntries([...PACKAGE_GATED_KEYS].map((k) => [k, true])),
      maxUsers: input.maxUsers ?? 50,
      maxBranches: input.maxBranches ?? 5,
      maxRoles: 10,
    });
    const domain = em.create(Domain, {
      tenant,
      domain: `${slug}.${env.PLATFORM_HOST}`,
      isPrimary: true,
      verifiedAt: new Date(),
    });
    await em.persistAndFlush([tenant, domain]);
    await em.getConnection().execute(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await this.createTenantTables(schemaName, em);
    await this.seedTenant(schemaName, tenant.name, em);
    return tenant;
  }

  async seedTenant(schema: string, displayName: string, em: EntityManager = this.em) {
    const knex = em.getConnection().getKnex();
    const now = new Date();
    for (const slug of SYSTEM_TENANT_ROLES) {
      const existing = await knex(`${schema}.roles`).where({ slug }).first();
      let roleId = existing?.id;
      if (!roleId) {
        const { v7 } = await import("uuid");
        roleId = v7();
        await knex(`${schema}.roles`).insert({
          id: roleId,
          name: slug.replace("_", " "),
          slug,
          is_system: true,
          is_active: true,
          is_published: false,
          is_deleted: false,
          created_at: now,
          updated_at: now,
        });
      }
      const matrix = ROLE_MATRIX[slug] ?? {};
      for (const [featureKey, level] of Object.entries(matrix)) {
        const has = await knex(`${schema}.role_permissions`).where({ role_id: roleId, feature_key: featureKey }).first();
        if (!has) {
          const { v7 } = await import("uuid");
          await knex(`${schema}.role_permissions`).insert({
            id: v7(),
            role_id: roleId,
            feature_key: featureKey,
            permission_level: level,
          });
        }
      }
    }
    const hq = await knex(`${schema}.branches`).where({ code: "HQ" }).first();
    if (!hq) {
      const { v7 } = await import("uuid");
      await knex(`${schema}.branches`).insert({
        id: v7(),
        name: `${displayName} HQ`,
        code: "HQ",
        is_headquarters: true,
        status: "active",
        is_active: true,
        is_published: true,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      });
    }
    const settings = await knex(`${schema}.tenant_settings`).first();
    if (!settings) {
      const { v7 } = await import("uuid");
      await knex(`${schema}.tenant_settings`).insert({
        id: v7(),
        display_name: displayName,
        title: `${displayName} | Hajj & Umrah`,
        description: "Pilgrimage booking with Wufud.",
        currency: "BDT",
        is_active: true,
        is_published: true,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      });
    }
  }

  async createTenantTables(schema: string, em: EntityManager = this.em) {
    const sql = TENANT_DDL.replaceAll("__SCHEMA__", schema);
    await em.getConnection().execute(sql);
  }
}
