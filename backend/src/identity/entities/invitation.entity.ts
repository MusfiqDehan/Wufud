import { Entity, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";

@Entity({ schema: "public", tableName: "invitations" })
export class Invitation extends BaseEntity {
  @Property()
  email!: string;

  @Property({ nullable: true })
  fullName?: string;

  @Property()
  tokenHash!: string;

  @Property()
  type!: "employee" | "tenant_owner" | "platform";

  @Property()
  expiresAt!: Date;

  @Property({ nullable: true })
  acceptedAt?: Date;

  @Property({ nullable: true, type: "uuid" })
  invitedById?: string;

  @Property({ nullable: true, type: "uuid" })
  tenantId?: string;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown>;
}
