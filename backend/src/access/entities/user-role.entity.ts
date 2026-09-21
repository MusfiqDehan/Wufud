import { Entity, ManyToOne, Property, Unique } from "@mikro-orm/core";
import { UuidEntity } from "../../shared/entities/uuid.entity";
import { Role } from "./role.entity";
import { Branch } from "./branch.entity";

@Entity({ schema: "*", tableName: "user_roles" })
@Unique({ properties: ["userId", "role", "branch"] })
export class UserRole extends UuidEntity {
  @Property({ type: "uuid" })
  userId!: string;

  @Property({ nullable: true })
  userEmail?: string;

  @ManyToOne(() => Role)
  role!: Role;

  @ManyToOne(() => Branch, { nullable: true })
  branch?: Branch;

  @Property({ nullable: true })
  assignedByEmail?: string;
}
