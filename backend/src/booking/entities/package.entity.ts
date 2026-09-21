import { Collection, Entity, ManyToOne, OneToMany, Property } from "@mikro-orm/core";
import { BaseEntity } from "../../shared/entities/base.entity";
import { Branch } from "../../access/entities/branch.entity";

@Entity({ schema: "*", tableName: "packages" })
export class TravelPackage extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  kind!: "hajj" | "ramadan_umrah" | "offseason_umrah" | "ziyarah";

  @Property({ type: "text", nullable: true })
  description?: string;

  @Property()
  departureDate!: Date;

  @Property()
  bookingOpensAt!: Date;

  @Property()
  bookingClosesAt!: Date;

  @ManyToOne(() => Branch, { nullable: true })
  branch?: Branch;

  @Property({ type: "int", default: 14 })
  durationDays = 14;

  @Property({ type: "int", default: 10 })
  maxPilgrims = 10;

  @Property({ nullable: true })
  makkahHotel?: string;

  @Property({ nullable: true })
  makkahDistance?: string;

  @Property({ nullable: true })
  madinahHotel?: string;

  @Property({ nullable: true })
  madinahDistance?: string;

  @Property({ nullable: true })
  airline?: string;

  @Property({ nullable: true })
  flightRoute?: string;

  @Property({ type: "json", nullable: true })
  inclusions?: string[];

  @Property({ type: "json", nullable: true })
  itinerary?: { day: string; title: string; desc: string }[];

  @Property({ default: false })
  featured = false;

  @Property({ nullable: true })
  bannerImage?: string;

  @OneToMany(() => PackageTier, (t) => t.package)
  tiers = new Collection<PackageTier>(this);
}

@Entity({ schema: "*", tableName: "package_tiers" })
export class PackageTier extends BaseEntity {
  @ManyToOne(() => TravelPackage)
  package!: TravelPackage;

  @Property()
  name!: string;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  price!: string;

  @Property({ default: "BDT" })
  currency = "BDT";

  @Property({ type: "int" })
  seatsTotal!: number;

  @Property({ type: "int", default: 0 })
  seatsConfirmed = 0;

  @Property({ type: "int", default: 0 })
  seatsHeld = 0;

  @Property({ nullable: true })
  roomType?: string;

  @Property({ type: "json", nullable: true })
  features?: string[];

  get seatsAvailable(): number {
    return this.seatsTotal - this.seatsConfirmed - this.seatsHeld;
  }
}
