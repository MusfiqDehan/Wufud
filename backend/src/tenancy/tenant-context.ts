import { AsyncLocalStorage } from "node:async_hooks";
import { Tenant } from "./entities/tenant.entity";

export type TenantStore = {
  tenant?: Tenant;
  schema: string;
  host: string;
  plane: "platform" | "tenant";
};

export const tenantAls = new AsyncLocalStorage<TenantStore>();

export function getTenantStore(): TenantStore | undefined {
  return tenantAls.getStore();
}

export function requireTenant(): Tenant {
  const store = tenantAls.getStore();
  if (!store?.tenant) {
    throw new Error("Tenant context missing");
  }
  return store.tenant;
}
