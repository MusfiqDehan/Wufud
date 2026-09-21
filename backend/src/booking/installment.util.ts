import { EntityManager } from "@mikro-orm/core";
import { Booking } from "./entities/booking.entity";
import { InstallmentPlan } from "./entities/installment.entity";
export { buildInstallmentSchedule } from "./installment.schedule";

export async function applyPaymentToInstallments(em: EntityManager, booking: Booking, amount: number) {
  const plan = await em.findOne(InstallmentPlan, { booking: booking.id }, { populate: ["installments"] });
  if (!plan) return;
  let remaining = amount;
  const items = [...plan.installments].sort((a, b) => a.sequence - b.sequence);
  for (const inst of items) {
    if (remaining <= 0) break;
    if (inst.status === "paid") continue;
    const due = Math.max(0, Number(inst.amountDue) - Number(inst.amountPaid) - Number(inst.amountWaived));
    const apply = Math.min(due, remaining);
    inst.amountPaid = (Number(inst.amountPaid) + apply).toFixed(2);
    remaining -= apply;
    if (Number(inst.amountPaid) + Number(inst.amountWaived) >= Number(inst.amountDue)) inst.status = "paid";
  }
}
