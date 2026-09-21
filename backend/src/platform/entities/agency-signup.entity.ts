import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Plan } from "./plan.entity";

@Entity({ schema: "public", tableName: "agency_signups" })
export class AgencySignup extends BaseEntity {
  @Property()
  agencyName!: string;

  @Property()
  slug!: string;

  @Property()
  ownerEmail!: string;

  @Property()
  ownerFullName!: string;

  @Property({ type: "text" })
  passwordHash!: string;

  @ManyToOne(() => Plan)
  plan!: Plan;

  @Property()
  mode: "trial" | "paid" = "trial";

  @Property({ default: "pending" })
  status: "pending" | "provisioned" | "failed" | "expired" = "pending";

  @Property({ nullable: true })
  gatewaySlug?: string;

  @Property({ nullable: true })
  tranId?: string;

  @Property({ nullable: true, type: "uuid" })
  tenantId?: string;

  @Property({ nullable: true })
  verifyTokenHash?: string;

  @Property({ nullable: true })
  verificationExpiresAt?: Date;
}
