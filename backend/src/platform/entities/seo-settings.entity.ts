import { Entity, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";

@Entity({ schema: "public", tableName: "platform_seo_settings" })
export class PlatformSeoSettings extends BaseEntity {
  @Property()
  title!: string;

  @Property({ type: "text", nullable: true })
  description?: string;

  @Property({ nullable: true })
  ogImageUrl?: string;

  @Property({ type: "text", nullable: true })
  keywords?: string;

  @Property({ nullable: true })
  robots?: string;
}

@Entity({ schema: "public", tableName: "platform_audit_logs" })
export class PlatformAuditLog extends BaseEntity {
  @Property({ nullable: true, type: "uuid" })
  actorId?: string;

  @Property()
  action!: string;

  @Property()
  targetType!: string;

  @Property({ nullable: true, type: "uuid" })
  targetId?: string;

  @Property({ type: "json", nullable: true })
  metadata?: Record<string, unknown>;
}
