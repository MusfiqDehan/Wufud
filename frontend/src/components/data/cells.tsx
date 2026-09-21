import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/utils";

export function StatusBadge({ value }: { value: string }) {
  return <Badge>{value}</Badge>;
}

export function MoneyCell({ value, currency = "BDT" }: { value: string | number; currency?: string }) {
  return <span>{money(value, currency)}</span>;
}

export function DateCell({ value }: { value: string | Date }) {
  return <span>{new Date(value).toLocaleDateString()}</span>;
}
