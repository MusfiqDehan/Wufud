import { Entity, ManyToOne, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Booking } from "../../booking/entities/booking.entity";

@Entity({ schema: "*", tableName: "stock_items" })
export class StockItem extends BaseEntity {
  @Property()
  name!: string;

  @Property({ default: "product" })
  kind: "product" | "service" = "product";

  @Property({ type: "decimal", precision: 12, scale: 2, default: "0" })
  salePrice = "0";

  @Property({ type: "int", default: 0 })
  quantity = 0;

  @Property({ type: "decimal", precision: 12, scale: 2, default: "0" })
  unitCost = "0";
}

@Entity({ schema: "*", tableName: "stock_issues" })
export class StockIssue extends BaseEntity {
  @Property({ type: "uuid", nullable: true, unique: true })
  reversalOf?: string;

  @ManyToOne(() => StockItem)
  item!: StockItem;

  @ManyToOne(() => Booking, { nullable: true })
  booking?: Booking;

  @Property({ type: "int" })
  quantity!: number;

  @Property({ type: "decimal", precision: 12, scale: 2, default: "0" })
  costBdt = "0";
}

@Entity({ schema: "*", tableName: "expenses" })
export class Expense extends BaseEntity {
  @Property()
  title!: string;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Property({ default: "BDT" })
  currency = "BDT";

  @Property({ nullable: true })
  category?: string;
}
