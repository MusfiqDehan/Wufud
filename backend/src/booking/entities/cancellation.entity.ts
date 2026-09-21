import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Booking } from "./booking.entity";

@Entity({ schema: "*", tableName: "cancellation_rules" })
export class CancellationRule extends BaseEntity {
  @Property({ type: "int" })
  daysBeforeDeparture!: number;

  @Property({ type: "decimal", precision: 5, scale: 2 })
  chargePercent!: string;
}

@Entity({ schema: "*", tableName: "cancellations" })
export class Cancellation extends BaseEntity {
  @ManyToOne(() => Booking)
  booking!: Booking;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  chargeAmount!: string;

  @Property({ type: "text", nullable: true })
  reason?: string;

  @Property({ default: false })
  isPartial = false;
}

@Entity({ schema: "*", tableName: "refund_requests" })
export class RefundRequest extends BaseEntity {
  @ManyToOne(() => Booking)
  booking!: Booking;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Property({ default: "requested" })
  status: "requested" | "approved" | "processing" | "paid" | "rejected" = "requested";

  @Property({ nullable: true, type: "uuid" })
  approvedById?: string;

  @Property({ type: "text", nullable: true })
  note?: string;
}
