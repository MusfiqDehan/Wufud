import { Injectable, NestMiddleware } from "@nestjs/common";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import { NextFunction, Request, Response } from "express";
import { ErrorCode } from "@wufud/contracts";
import { DomainError } from "../shared/errors/domain.error";
import { PlatformDomain } from "./entities/platform-domain.entity";
import { Domain } from "./entities/domain.entity";
import { Tenant } from "./entities/tenant.entity";
import { tenantAls } from "./tenant-context";

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private readonly orm: MikroORM) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const host = this.normalizeHost(req.headers["x-forwarded-host"] ?? req.headers.host ?? "");
    const lookup = this.orm.em.fork({ schema: "public" });
    const platform = await lookup.findOne(PlatformDomain, { host, isDeleted: false });
    if (platform) {
      (req as Request & { tenant?: unknown }).tenant = undefined;
      return this.enter(req, { schema: "public", host, plane: "platform" }, next);
    }

    const custom = await lookup.findOne(Domain, { domain: host, isDeleted: false }, { populate: ["tenant"] });
    if (custom?.verifiedAt && custom.tenant) {
      return this.enterTenant(req, custom.tenant, host, next);
    }

    const slug = this.slugFromHost(host);
    if (slug) {
      const tenant = await lookup.findOne(Tenant, { slug, isDeleted: false });
      if (!tenant) {
        throw new DomainError(ErrorCode.TENANT_NOT_FOUND, undefined, 404);
      }
      return this.enterTenant(req, tenant, host, next);
    }

    return this.enter(req, { schema: "public", host, plane: "platform" }, next);
  }

  private enterTenant(req: Request, tenant: Tenant, host: string, next: NextFunction) {
    if (!tenant.allowsEntry) {
      throw new DomainError(ErrorCode.TENANT_SUSPENDED, undefined, 403);
    }
    (req as Request & { tenant?: Tenant }).tenant = tenant;
    return this.enter(req, { tenant, schema: tenant.schemaName, host, plane: "tenant" }, next);
  }

  private enter(
    _req: Request,
    store: { tenant?: Tenant; schema: string; host: string; plane: "platform" | "tenant" },
    next: NextFunction,
  ) {
    const em = this.orm.em.fork({ schema: store.schema });
    return tenantAls.run(store, () => RequestContext.create(em, next));
  }

  private normalizeHost(raw: string | string[]): string {
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value.split(":")[0].toLowerCase().trim();
  }

  private slugFromHost(host: string): string | null {
    const parts = host.split(".");
    if (parts.length >= 3 && (parts[1] === "wufud" || host.includes("wufud.localhost"))) {
      if (host.endsWith("wufud.localhost") && parts[0] && parts[0] !== "wufud") {
        return parts[0];
      }
      if (parts.length >= 3 && parts[1] === "wufud") {
        return parts[0];
      }
    }
    if (host.endsWith(".localhost") && parts[0] !== "wufud" && parts[0] !== "localhost") {
      return parts[0];
    }
    return null;
  }
}
