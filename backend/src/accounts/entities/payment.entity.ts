import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Booking } from "../../booking/entities/booking.entity";
import { Branch } from "../../access/entities/branch.entity";

@Entity({ schema: "*", tableName: "payments" })
export class Payment extends BaseEntity {
  @ManyToOne(() => Booking)
  booking!: Booking;

  @Property()
  source!: "gateway" | "manual";

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Property({ default: "BDT" })
  currency = "BDT";

  @Property({ nullable: true })
  gatewaySlug?: string;

  @Property({ nullable: true })
  tranId?: string;
}

@Entity({ schema: "*", tableName: "manual_payments" })
export class ManualPayment extends BaseEntity {
  @Property({ nullable: true, unique: true })
  requestKey?: string;

  @Property({ type: "json", nullable: true })
  receipt?: Record<string, any>;

  @ManyToOne(() => Booking)
  booking!: Booking;

  @ManyToOne(() => Branch, { nullable: true })
  branch?: Branch;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Property({ default: "cash" })
  method: "cash" | "card" | "bkash" | "nagad" | "bank_transfer" = "cash";

  @Property({ type: "uuid" })
  recordedById!: string;

  @Property({ nullable: true, type: "uuid" })
  approvedById?: string;

  @Property({ default: "pending" })
  status: "pending" | "approved" | "rejected" = "pending";
}
