import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Tenant } from "../../tenancy/entities/tenant.entity";
import { Plan } from "./plan.entity";

@Entity({ schema: "public", tableName: "tenant_subscriptions" })
export class TenantSubscription extends BaseEntity {
  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @ManyToOne(() => Plan)
  plan!: Plan;

  @Property({ default: "active" })
  status: "trialing" | "active" | "past_due" | "cancelled" = "active";

  @Property()
  currentPeriodStart!: Date;

  @Property()
  currentPeriodEnd!: Date;
}

@Entity({ schema: "public", tableName: "subscription_invoices" })
export class SubscriptionInvoice extends BaseEntity {
  @ManyToOne(() => TenantSubscription)
  subscription!: TenantSubscription;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Property({ default: "BDT" })
  currency = "BDT";

  @Property({ default: "open" })
  status: "open" | "paid" | "void" = "open";

  @Property({ nullable: true })
  paidAt?: Date;
}
