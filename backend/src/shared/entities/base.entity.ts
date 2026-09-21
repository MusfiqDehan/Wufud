import { Filter, OptionalProps, Property } from "@mikro-orm/core";
import { UuidEntity } from "./uuid.entity";

@Filter({ name: "softDelete", cond: { deletedAt: null, isDeleted: false }, default: true })
export abstract class BaseEntity extends UuidEntity {
  [OptionalProps]?: "createdAt" | "updatedAt" | "isActive" | "isPublished" | "isDeleted";

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true, type: "uuid" })
  createdBy?: string;

  @Property({ nullable: true, type: "uuid" })
  updatedBy?: string;

  @Property({ nullable: true, type: "uuid" })
  deletedBy?: string;

  @Property({ default: true })
  isActive = true;

  @Property({ default: false })
  isPublished = false;

  @Property({ default: false })
  isDeleted = false;

  @Property({ nullable: true })
  deletedAt?: Date;

  softDelete(actorId?: string) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = actorId;
    this.isActive = false;
  }

  restore() {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    this.isActive = true;
  }
}
