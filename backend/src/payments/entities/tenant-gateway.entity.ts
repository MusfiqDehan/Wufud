import { Entity, Property, Unique } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";

@Entity({ schema: "*", tableName: "tenant_gateway_instances" })
@Unique({ properties: ["gatewaySlug"] })
export class TenantGatewayInstance extends BaseEntity {
  @Property()
  gatewaySlug!: string;

  @Property({ type: "json", hidden: true, nullable: true })
  credentials?: Record<string, string>;

  @Property({ default: true })
  isSandbox = true;

  @Property({ fieldName: "is_gateway_active", default: false })
  isGatewayActive = false;

  @Property({ default: false })
  isDefault = false;
}
