import { Entity, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";

@Entity({ schema: "public", tableName: "platform_domains" })
export class PlatformDomain extends BaseEntity {
  @Property({ unique: true })
  host!: string;

  @Property({ default: false })
  isPrimary = false;
}
