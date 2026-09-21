import { Entity, Property, Unique } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";

export type GatewayField = {
  key: string;
  label: string;
  type: "text" | "password" | "boolean";
  required: boolean;
};

@Entity({ schema: "public", tableName: "payment_gateway_catalog" })
@Unique({ properties: ["slug"] })
export class PaymentGatewayCatalog extends BaseEntity {
  @Property()
  slug!: string;

  @Property()
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ default: false })
  isEnabledForTenants = false;

  @Property({ type: "json" })
  configSchema: GatewayField[] = [];

  @Property({ type: "json", hidden: true, nullable: true })
  platformCredentials?: Record<string, string>;

  @Property({ default: true })
  isSandbox = true;

  @Property({ default: false })
  isDefault = false;

  @Property({ type: "int", default: 0 })
  sortOrder = 0;
}
