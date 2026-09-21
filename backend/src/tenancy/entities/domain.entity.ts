import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Tenant } from "./tenant.entity";

@Entity({ schema: "public", tableName: "domains" })
export class Domain extends BaseEntity {
  @ManyToOne(() => Tenant)
  tenant!: Tenant;

  @Property({ unique: true })
  domain!: string;

  @Property({ default: false })
  isPrimary = false;

  @Property({ nullable: true })
  verificationToken?: string;

  @Property({ nullable: true })
  verifiedAt?: Date;
}
