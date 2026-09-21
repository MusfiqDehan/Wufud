import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Booking } from "../../booking/entities/booking.entity";

@Entity({ schema: "*", tableName: "vendors" })
export class Vendor extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  kind!: "hotel" | "airline" | "transport" | "visa" | "other";

  @Property({ nullable: true })
  contact?: string;
}

@Entity({ schema: "*", tableName: "vendor_disbursements" })
export class VendorDisbursement extends BaseEntity {
  @ManyToOne(() => Vendor)
  vendor!: Vendor;

  @ManyToOne(() => Booking, { nullable: true })
  booking?: Booking;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amountSar!: string;

  @Property({ type: "decimal", precision: 10, scale: 4 })
  fxRate!: string;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amountBdt!: string;

  @Property({ type: "text", nullable: true })
  note?: string;
}
