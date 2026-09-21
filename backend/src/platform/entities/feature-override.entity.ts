import { Entity, ManyToOne, Property, Unique } from "@mikro-orm/core";
import { UuidEntity } from "../../shared/entities/uuid.entity";
import { Tenant } from "../../tenancy/entities/tenant.entity";

@Entity({ schema: "public", tableName: "tenant_feature_overrides" })
@Unique({ properties: ["tenant", "featureKey"] })
export class TenantFeatureOverride extends UuidEntity {
  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @Property()
  featureKey!: string;

  @Property()
  enabled!: boolean;
}
