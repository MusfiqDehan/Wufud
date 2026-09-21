import { Collection, Entity, ManyToOne, OneToMany, Property, Unique } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";

@Entity({ schema: "public", tableName: "platform_roles" })
@Unique({ properties: ["slug"] })
export class PlatformRole extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  slug!: string;

  @Property({ default: false })
  isSystem = false;

  @Property({ nullable: true })
  color?: string;

  @OneToMany(() => PlatformRolePermission, (p) => p.role)
  permissions = new Collection<PlatformRolePermission>(this);
}

@Entity({ schema: "public", tableName: "platform_role_permissions" })
@Unique({ properties: ["role", "moduleKey"] })
export class PlatformRolePermission extends BaseEntity {
  @ManyToOne(() => PlatformRole)
  role!: PlatformRole;

  @Property()
  moduleKey!: string;

  @Property()
  permissionLevel!: "none" | "view" | "edit" | "full";
}
