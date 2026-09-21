import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Tenant } from "../../tenancy/entities/tenant.entity";

@Entity({ schema: "public", tableName: "users" })
export class User extends BaseEntity {
  @Property({ nullable: true })
  email?: string;

  @Property({ nullable: true })
  phone?: string;

  @Property()
  fullName!: string;

  @ManyToOne(() => Tenant, { nullable: true })
  tenant?: Tenant;

  @Property({ default: false })
  emailVerified = false;

  @Property({ hidden: true, nullable: true })
  passwordHash?: string;

  @Property({ nullable: true })
  passwordSetAt?: Date;

  @Property({ nullable: true })
  lastLogin?: Date;

  @Property({ hidden: true, nullable: true })
  refreshTokenHash?: string;

}

