import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(value: string | number, currency = "BDT") {
  const n = Number(value);
  return `${currency} ${n.toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;
}
