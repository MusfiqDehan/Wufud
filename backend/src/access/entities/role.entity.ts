import { Collection, Entity, OneToMany, Property, Unique } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { RolePermission } from "./role-permission.entity";

@Entity({ schema: "*", tableName: "roles" })
@Unique({ properties: ["slug"] })
export class Role extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  slug!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ default: false })
  isSystem = false;

  @Property({ nullable: true })
  color?: string;

  @OneToMany(() => RolePermission, (p) => p.role)
  permissions = new Collection<RolePermission>(this);
}
