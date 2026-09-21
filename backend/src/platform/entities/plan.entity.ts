import { Entity, Property, Unique } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";

@Entity({ schema: "public", tableName: "plans" })
@Unique({ properties: ["slug"] })
export class Plan extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  slug!: string;

  @Property({ type: "text", nullable: true })
  description?: string;

  @Property({ type: "decimal", precision: 12, scale: 2, default: "0" })
  priceMonthly = "0";

  @Property({ default: "BDT" })
  currency = "BDT";

  @Property({ type: "json" })
  features: string[] = [];

  @Property({ type: "int", default: 0 })
  maxUsers = 0;

  @Property({ type: "int", default: 0 })
  maxBranches = 0;

  @Property({ type: "int", default: 0 })
  sortOrder = 0;

  @Property({ type: "int", default: 14 })
  trialDays = 14;

  @Property({ type: "int", default: 168 })
  invitationExpiresHours = 168;
}
