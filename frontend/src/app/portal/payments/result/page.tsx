import { redirect } from "next/navigation";

export default async function PaymentResult({
  searchParams,
}: {
  searchParams: Promise<{ payment_status?: string; tran_id?: string }>;
}) {
  const q = await searchParams;
  const params = new URLSearchParams();
  if (q.tran_id) params.set("tran_id", q.tran_id);
  if (q.payment_status === "cancelled") params.set("reason", "cancelled");
  const query = params.toString() ? `?${params.toString()}` : "";
  redirect(q.payment_status === "success" ? `/portal/payments/success${query}` : `/portal/payments/fail${query}`);
}
