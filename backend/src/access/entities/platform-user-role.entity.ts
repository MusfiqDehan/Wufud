import { Entity, ManyToOne, Property, Unique } from "@mikro-orm/core";
import { UuidEntity } from "../../shared/entities/uuid.entity";
import { PlatformRole } from "./platform-role.entity";

@Entity({ schema: "public", tableName: "platform_user_roles" })
@Unique({ properties: ["userId", "role"] })
export class PlatformUserRole extends UuidEntity {
  @Property({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => PlatformRole)
  role!: PlatformRole;

  @Property({ nullable: true, type: "uuid" })
  assignedById?: string;
}
