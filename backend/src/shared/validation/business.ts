import { BadRequestException } from "@nestjs/common";
export function positiveMoney(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,10}(\.\d{1,2})?$/.test(value) || Number(value) <= 0) throw new BadRequestException("Enter a positive amount with at most two decimal places.");
  return Number(value);
}
export function positiveQuantity(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new BadRequestException("Quantity must be a positive whole number.");
  return value;
}
