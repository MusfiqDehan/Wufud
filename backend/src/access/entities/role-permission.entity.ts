import { Entity, ManyToOne, Property, Unique } from "@mikro-orm/core";
import { UuidEntity } from "../../shared/entities/uuid.entity";
import { Role } from "./role.entity";

@Entity({ schema: "*", tableName: "role_permissions" })
@Unique({ properties: ["role", "featureKey"] })
export class RolePermission extends UuidEntity {
  @ManyToOne(() => Role)
  role!: Role;

  @Property()
  featureKey!: string;

  @Property()
  permissionLevel!: "none" | "view" | "edit" | "full";
}
