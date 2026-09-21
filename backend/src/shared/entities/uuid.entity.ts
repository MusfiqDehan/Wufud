import { PrimaryKey } from "@mikro-orm/core";
import { newId } from "../utils/uuid";

export abstract class UuidEntity {
  @PrimaryKey({ type: "uuid" })
  id: string = newId();
}
