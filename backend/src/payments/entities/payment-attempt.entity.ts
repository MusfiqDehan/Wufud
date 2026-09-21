import { Entity, Property, Unique } from "@mikro-orm/core";
import { UuidEntity } from "../../shared/entities/uuid.entity";

@Entity({ schema: "*", tableName: "payment_attempts" })
@Unique({ properties: ["tranId"] })
export class PaymentAttempt extends UuidEntity {
  @Property()
  tranId!: string;

  @Property()
  gatewaySlug!: string;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Property()
  currency!: string;

  @Property({ default: "init" })
  status: "init" | "pending" | "success" | "failed" | "cancelled" = "init";

  @Property()
  sourceRef!: string;

  @Property({ nullable: true })
  valId?: string;

  @Property({ type: "json", nullable: true })
  gatewayResponse?: Record<string, unknown>;

  @Property({ nullable: true })
  validatedAt?: Date;

  @Property()
  createdAt: Date = new Date();
}

@Entity({ schema: "public", tableName: "platform_payment_attempts" })
@Unique({ properties: ["tranId"] })
export class PlatformPaymentAttempt extends UuidEntity {
  @Property()
  tranId!: string;

  @Property()
  gatewaySlug!: string;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Property()
  currency!: string;

  @Property({ default: "init" })
  status: "init" | "pending" | "success" | "failed" | "cancelled" = "init";

  @Property()
  sourceRef!: string;

  @Property({ nullable: true })
  valId?: string;

  @Property({ type: "json", nullable: true })
  gatewayResponse?: Record<string, unknown>;

  @Property({ nullable: true })
  validatedAt?: Date;

  @Property()
  createdAt: Date = new Date();
}

@Entity({ schema: "*", tableName: "webhook_events" })
@Unique({ properties: ["providerEventId"] })
export class WebhookEvent extends UuidEntity {
  @Property()
  providerEventId!: string;

  @Property()
  gatewaySlug!: string;

  @Property({ type: "json", nullable: true })
  payload?: Record<string, unknown>;

  @Property()
  createdAt: Date = new Date();
}
