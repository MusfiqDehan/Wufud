import { Entity, Property } from "@mikro-orm/core";
import { BaseEntity } from "./base.entity";

@Entity({ schema: "public", tableName: "assets" })
export class Asset extends BaseEntity {
  @Property()
  url!: string;

  @Property()
  mimeType!: string;

  @Property()
  originalFilename!: string;

  @Property({ nullable: true })
  altText?: string;

  @Property({ type: "int", default: 0 })
  sizeBytes = 0;
}

@Entity({ schema: "*" })
export class AssetRelation extends BaseEntity {
  @Property({ type: "uuid" })
  assetId!: string;

  @Property()
  parentType!: string;

  @Property({ type: "uuid" })
  parentId!: string;

  @Property()
  role!: string;

  @Property({ nullable: true })
  fieldName?: string;

  @Property({ type: "int", default: 0 })
  sortOrder = 0;

  @Property({ default: false })
  isPrimary = false;
}
