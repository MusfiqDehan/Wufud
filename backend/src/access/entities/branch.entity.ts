import { Entity, Property, Unique } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";

@Entity({ schema: "*", tableName: "branches" })
@Unique({ properties: ["code"] })
export class Branch extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  code!: string;

  @Property({ default: false })
  isHeadquarters = false;

  @Property({ default: "active" })
  status: "active" | "maintenance" | "opening_soon" | "closed" = "active";

  @Property({ nullable: true, type: "uuid" })
  managerId?: string;

  @Property({ nullable: true })
  address?: string;

  @Property({ nullable: true })
  city?: string;

  @Property({ nullable: true })
  phone?: string;

  @Property({ nullable: true })
  email?: string;
}
