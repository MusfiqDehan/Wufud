import { Collection, Entity, ManyToOne, OneToMany, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Booking } from "./booking.entity";

@Entity({ schema: "*", tableName: "installment_plans" })
export class InstallmentPlan extends BaseEntity {
  @ManyToOne(() => Booking)
  booking!: Booking;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  downPayment!: string;

  @OneToMany(() => Installment, (i) => i.plan)
  installments = new Collection<Installment>(this);
}

@Entity({ schema: "*", tableName: "installments" })
export class Installment extends BaseEntity {
  @ManyToOne(() => InstallmentPlan)
  plan!: InstallmentPlan;

  @Property({ type: "int" })
  sequence!: number;

  @Property()
  dueDate!: Date;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amountDue!: string;

  @Property({ type: "decimal", precision: 12, scale: 2, default: "0" })
  amountPaid = "0";

  @Property({ type: "decimal", precision: 12, scale: 2, default: "0" })
  amountWaived = "0";

  @Property({ default: "open" })
  status: "open" | "paid" | "overdue" | "defaulted" = "open";
}
