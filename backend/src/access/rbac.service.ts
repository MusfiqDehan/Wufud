import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import {
  PACKAGE_GATED_KEYS,
  PERMISSION_RANK,
  PermissionLevel,
  AccessMe,
} from "@wufud/contracts";
import { User } from "../identity/entities/user.entity";
import { Role } from "./entities/role.entity";
import { UserRole } from "./entities/user-role.entity";
import { PlatformUserRole } from "./entities/platform-user-role.entity";
import { TenantFeatureOverride } from "../platform/entities/feature-override.entity";
import { CacheService } from "../shared/cache/cache.service";
import { getTenantStore } from "../tenancy/tenant-context";
import { DomainError } from "../shared/errors/domain.error";
import { ErrorCode } from "@wufud/contracts";

@Injectable()
export class RbacService {
  constructor(
    private readonly em: EntityManager,
    private readonly cache: CacheService,
  ) {}

  async userCan(user: User, featureKey: string, required: PermissionLevel = "view"): Promise<boolean> {
    const store = getTenantStore();
    if (featureKey.startsWith("platform.")) {
      return this.platformCan(user, featureKey, required);
    }
    if (!store?.tenant) return false;
    const enabled = await this.enabledFeatures(store.tenant.id, store.tenant.features ?? {});
    if (PACKAGE_GATED_KEYS.has(featureKey) && !enabled.includes(featureKey)) {
      return false;
    }
    if (await this.isTenantAdmin(user)) return true;
    // Portal permissions never authorize staff endpoints; /me routes enforce ownership.
    const roles = await this.roleSlugs(user);
    if (!roles.some(role => role !== "pilgrim")) return false;
    const map = await this.permissionMap(user);
    return (PERMISSION_RANK[(map[featureKey] as PermissionLevel) ?? "none"] ?? 0) >= PERMISSION_RANK[required];
  }

  async require(user: User, featureKey: string, required: PermissionLevel = "view") {
    if (!(await this.userCan(user, featureKey, required))) {
      throw new DomainError(ErrorCode.PERMISSION_DENIED, undefined, 403);
    }
  }

  async getBranchScopeIds(user: User): Promise<string[] | null> {
    if (!user) return null;
    if (await this.isTenantAdmin(user)) return null;
    const assignments = await this.em.find(UserRole, { userId: user.id }, { populate: ["branch"] });
    const ids = assignments.map((a) => a.branch?.id).filter((id): id is string => Boolean(id));
    return ids.length ? ids : null;
  }

  async assertBranchAccess(user: User, branchId?: string) {
    const scope = await this.getBranchScopeIds(user);
    if (scope === null) return;
    if (!branchId || !scope.includes(branchId)) {
      throw new DomainError(ErrorCode.PERMISSION_DENIED, undefined, 403);
    }
  }

  async me(user: User): Promise<AccessMe> {
    const store = getTenantStore();
    const cacheKey = `access:me:${store?.tenant?.id ?? "platform"}:${user.id}`;
    const cached = await this.cache.get<AccessMe>(cacheKey);
    if (cached) return cached;
    const isTenantAdmin = await this.isTenantAdmin(user);
    const isPlatformAdmin = await this.isPlatformSuperadmin(user);
    const enabled = store?.tenant
      ? await this.enabledFeatures(store.tenant.id, store.tenant.features ?? {})
      : [];
    const payload: AccessMe = {
      user_id: user.id,
      email: user.email ?? null,
      full_name: user.fullName,
      role_slugs: await this.roleSlugs(user),
      is_tenant_admin: isTenantAdmin,
      is_platform_admin: isPlatformAdmin,
      permissions: isTenantAdmin ? {} : await this.permissionMap(user),
      enabled_features: enabled,
      package_gated_features: [...PACKAGE_GATED_KEYS],
      tenant: store?.tenant
        ? { id: store.tenant.id, slug: store.tenant.slug, name: store.tenant.name }
        : undefined,
    };
    await this.cache.set(cacheKey, payload, 120);
    return payload;
  }

  async enabledFeatures(tenantId: string, base: Record<string, boolean>): Promise<string[]> {
    const overrides = await this.em.find(TenantFeatureOverride, { tenant: tenantId });
    const map = { ...base };
    for (const o of overrides) map[o.featureKey] = o.enabled;
    return Object.entries(map)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  async isTenantAdmin(user: User): Promise<boolean> {
    const store = getTenantStore();
    if (store?.plane !== "tenant" || !store.schema || store.schema === "public") return false;
    this.em.schema = store.schema;
    const rows = await this.em.find(UserRole, { userId: user.id }, { populate: ["role"] });
    return rows.some((r) => r.role.slug === "admin");
  }

  async isPlatformSuperadmin(user: User): Promise<boolean> {
    const rows = await this.em.find(PlatformUserRole, { userId: user.id }, { populate: ["role"] });
    return rows.some((r) => r.role.slug === "superadmin");
  }

  private async platformCan(user: User, key: string, required: PermissionLevel) {
    if (await this.isPlatformSuperadmin(user)) return true;
    const rows = await this.em.find(PlatformUserRole, { userId: user.id }, { populate: ["role.permissions"] });
    let max = 0;
    for (const row of rows) {
      await row.role.permissions.init();
      for (const p of row.role.permissions) {
        if (p.moduleKey === key) max = Math.max(max, PERMISSION_RANK[p.permissionLevel]);
      }
    }
    return max >= PERMISSION_RANK[required];
  }

  private async permissionMap(user: User): Promise<Record<string, string>> {
    const store = getTenantStore();
    if (store?.plane !== "tenant" || !store.schema || store.schema === "public") return {};
    this.em.schema = store.schema;
    const rows = await this.em.find(UserRole, { userId: user.id }, { populate: ["role.permissions"] });
    const map: Record<string, string> = {};
    for (const row of rows) {
      await row.role.permissions.init();
      for (const p of row.role.permissions) {
        const current = PERMISSION_RANK[(map[p.featureKey] as PermissionLevel) ?? "none"];
        if (PERMISSION_RANK[p.permissionLevel] > current) {
          map[p.featureKey] = p.permissionLevel;
        }
      }
    }
    return map;
  }

  private async roleSlugs(user: User): Promise<string[]> {
    const store = getTenantStore();
    if (store?.plane === "platform") {
      const rows = await this.em.find(PlatformUserRole, { userId: user.id }, { populate: ["role"] });
      return rows.map((r) => r.role.slug);
    }
    const rows = await this.em.find(UserRole, { userId: user.id }, { populate: ["role"] });
    return rows.map((r) => r.role.slug);
  }

  async replaceAssignments(
    actor: User,
    userId: string,
    assignments: { roleSlug: string; branchId?: string }[],
    userEmail?: string,
  ) {
    if (assignments.some((a) => a.roleSlug === "admin") && !(await this.isTenantAdmin(actor))) {
      throw DomainError.forbidden();
    }
    const existing = await this.em.find(UserRole, { userId }, { populate: ["role"] });
    const remainingAdmins = await this.em.count(UserRole, { role: { slug: "admin" } });
    if (
      actor.id === userId &&
      existing.some((e) => e.role.slug === "admin") &&
      !assignments.some((a) => a.roleSlug === "admin") &&
      remainingAdmins <= 1
    ) {
      throw new DomainError(ErrorCode.LAST_ADMIN, undefined, 409);
    }
    for (const row of existing) this.em.remove(row);
    for (const a of assignments) {
      const role = await this.em.findOneOrFail(Role, { slug: a.roleSlug });
      this.em.create(UserRole, {
        userId,
        userEmail,
        role,
        branch: a.branchId ? a.branchId : undefined,
      });
    }
    await this.em.flush();
    await this.cache.del(`access:me:${getTenantStore()?.tenant?.id}:${userId}`);
  }
}
