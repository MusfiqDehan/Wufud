import { Collection, Entity, ManyToOne, OneToMany, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { PackageTier } from "./package.entity";
import { Branch } from "../../access/entities/branch.entity";

@Entity({ schema: "*", tableName: "bookings" })
export class Booking extends BaseEntity {
  @Property({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => PackageTier)
  tier!: PackageTier;

  @ManyToOne(() => Branch, { nullable: true })
  branch?: Branch;

  @Property({ default: "draft" })
  status: "draft" | "held" | "confirmed" | "defaulted" | "cancelled" = "draft";

  @Property({ type: "decimal", precision: 12, scale: 2 })
  frozenPrice!: string;

  @Property({ default: "BDT" })
  currency = "BDT";

  @Property({ type: "int", default: 1 })
  pilgrimCount = 1;

  @Property({ default: "full" })
  paymentMode: "full" | "installment" = "full";

  @Property({ type: "decimal", precision: 12, scale: 2, default: "0" })
  amountReceived = "0";

  @Property({ nullable: true })
  holdExpiresAt?: Date;

  @Property({ persist: false })
  downPayment?: string;

  @OneToMany(() => BookingPilgrim, (p) => p.booking)
  pilgrims = new Collection<BookingPilgrim>(this);
}

@Entity({ schema: "*", tableName: "booking_pilgrims" })
export class BookingPilgrim extends BaseEntity {
  @ManyToOne(() => Booking)
  booking!: Booking;

  @Property()
  fullName!: string;

  @Property()
  passportNumber!: string;

  @Property({ nullable: true })
  nationality?: string;

  @Property({ nullable: true })
  dateOfBirth?: Date;

  @Property({ default: false })
  cancelled = false;
}

@Entity({ schema: "*", tableName: "seat_holds" })
export class SeatHold extends BaseEntity {
  @ManyToOne(() => PackageTier)
  tier!: PackageTier;

  @ManyToOne(() => Booking)
  booking!: Booking;

  @Property({ type: "int" })
  seats!: number;

  @Property()
  expiresAt!: Date;

  @Property({ default: true })
  isOpen = true;
}
