import { Collection, Entity, OneToMany, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Domain } from "./domain.entity";

export type TenantStatus = "active" | "trial" | "suspended" | "cancelled";

@Entity({ schema: "public", tableName: "tenants" })
export class Tenant extends BaseEntity {
  @Property()
  name!: string;

  @Property({ unique: true })
  slug!: string;

  @Property({ unique: true })
  schemaName!: string;

  @Property({ default: "trial" })
  status: TenantStatus = "trial";

  @Property({ default: true })
  isEnabled = true;

  @Property({ nullable: true })
  plan?: string;

  @Property({ type: "json", nullable: true })
  features?: Record<string, boolean>;

  @Property({ type: "int", default: 0 })
  maxUsers = 0;

  @Property({ type: "int", default: 0 })
  maxBranches = 0;

  @Property({ type: "int", default: 0 })
  maxRoles = 0;

  @Property({ nullable: true })
  ownerEmail?: string;

  @Property({ default: "Asia/Dhaka" })
  timezone = "Asia/Dhaka";

  @Property({ default: "BDT" })
  currency = "BDT";

  @Property({ default: "en" })
  locale = "en";

  @Property({ type: "int", default: 0 })
  version = 0;

  @OneToMany(() => Domain, (d) => d.tenant)
  domains = new Collection<Domain>(this);

  get allowsEntry(): boolean {
    return this.isEnabled && (this.status === "active" || this.status === "trial");
  }
}
