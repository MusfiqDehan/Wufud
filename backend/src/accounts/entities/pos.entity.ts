import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { StockItem } from "./stock.entity";

@Entity({ schema: "*", tableName: "pos_sales" })
export class PosSale extends BaseEntity {
  @Property({ type: "json", nullable: true }) receipt?: Record<string, any>;
  @Property({ type: "json", nullable: true }) refundReceipt?: Record<string, any>;
  @Property({ unique: true }) requestKey!: string;
  @Property({ type: "decimal", precision: 12, scale: 2 }) total!: string;
  @Property({ default: "paid" }) status: "paid" | "refunded" = "paid";
  @Property({ type: "json" }) lines!: { itemId: string; name: string; kind: string; quantity: number; unitPrice: string; stockIssueId?: string }[];
}
