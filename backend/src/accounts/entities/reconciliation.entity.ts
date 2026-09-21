import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { UuidEntity } from "../../shared/entities/uuid.entity";

@Entity({ schema: "*", tableName: "settlement_reports" })
export class SettlementReport extends BaseEntity {
  @Property()
  gatewaySlug!: string;

  @Property()
  periodStart!: Date;

  @Property()
  periodEnd!: Date;

  @Property({ default: "open" })
  status: "open" | "reconciled" = "open";
}

@Entity({ schema: "*", tableName: "reconciliation_items" })
export class ReconciliationItem extends UuidEntity {
  @ManyToOne(() => SettlementReport)
  report!: SettlementReport;

  @Property({ nullable: true })
  tranId?: string;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  gatewayAmount!: string;

  @Property({ type: "decimal", precision: 12, scale: 2, nullable: true })
  internalAmount?: string;

  @Property({ default: "mismatch" })
  status: "matched" | "mismatch" | "resolved" = "mismatch";

  @Property({ type: "text", nullable: true })
  note?: string;
}

@Entity({ schema: "*", tableName: "daily_booking_stats" })
export class DailyBookingStat extends UuidEntity {
  @Property()
  day!: Date;

  @Property({ nullable: true, type: "uuid" })
  branchId?: string;

  @Property({ type: "int", default: 0 })
  bookingsCount = 0;

  @Property({ type: "decimal", precision: 14, scale: 2, default: "0" })
  collected = "0";

  @Property({ type: "decimal", precision: 14, scale: 2, default: "0" })
  outstanding = "0";
}

@Entity({ schema: "*", tableName: "audit_logs" })
export class AuditLog extends BaseEntity {
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

@Entity({ schema: "*", tableName: "tenant_settings" })
export class TenantSettings extends BaseEntity {
  @Property()
  displayName!: string;

  @Property({ nullable: true })
  logoUrl?: string;

  @Property({ nullable: true })
  primaryColor?: string;

  @Property({ nullable: true })
  title?: string;

  @Property({ type: "text", nullable: true })
  description?: string;

  @Property({ nullable: true })
  ogImageUrl?: string;

  @Property({ type: "text", nullable: true })
  keywords?: string;

  @Property({ default: "BDT" })
  currency = "BDT";
}
