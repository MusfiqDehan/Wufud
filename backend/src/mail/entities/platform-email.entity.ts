import { Entity, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";

@Entity({ schema: "public", tableName: "platform_email_accounts" })
export class PlatformEmailAccount extends BaseEntity {
  @Property()
  label!: string;

  @Property()
  host!: string;

  @Property({ type: "int" })
  port = 465;

  @Property()
  username!: string;

  @Property({ hidden: true, nullable: true })
  password?: string;

  @Property()
  fromAddress!: string;

  @Property({ nullable: true })
  fromName?: string;

  @Property({ default: true })
  useSsl = true;

  @Property({ default: false })
  isDefault = false;
}
