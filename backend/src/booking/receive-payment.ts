import { LockMode } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { Booking, SeatHold } from "./entities/booking.entity";
import { PackageTier } from "./entities/package.entity";
import { InstallmentPlan } from "./entities/installment.entity";
import { applyPaymentToInstallments } from "./installment.util";
import { Cancellation } from "./entities/cancellation.entity";
import { AuditLog } from "../accounts/entities/reconciliation.entity";

/** Caller holds the booking lock; all receipt and seat changes commit together. */
export async function receivePayment(em: EntityManager, booking: Booking, amount: number) {
  booking.amountReceived = (Number(booking.amountReceived) + amount).toFixed(2);
  await applyPaymentToInstallments(em, booking, amount);
  if (booking.status !== "held") return; // Late receipts remain reconcilable; never resurrect released seats.
  const plan = await em.findOne(InstallmentPlan, { booking: booking.id });
  await em.populate(booking, ["pilgrims"]);
  const cancellations = await em.find(Cancellation, { booking: booking.id }, { filters: { softDelete: false } });
  const obligation = Number(booking.frozenPrice) * booking.pilgrimCount / booking.pilgrims.length + cancellations.reduce((sum, c) => sum + Number(c.chargeAmount), 0);
  const threshold = plan ? Math.min(Number(plan.downPayment), obligation) : obligation;
  if (Number(booking.amountReceived) < threshold) return;
  const tier = await em.findOneOrFail(PackageTier, { id: booking.tier.id }, { lockMode: LockMode.PESSIMISTIC_WRITE, filters: { softDelete: false } });
  const hold = await em.findOne(SeatHold, { booking: booking.id, isOpen: true });
  if (!hold) return;
  tier.seatsHeld -= hold.seats;
  hold.isOpen = false;
  if (hold.expiresAt.getTime() <= Date.now()) {
    booking.status = "cancelled";
    em.create(AuditLog, { action: "payment.late_receipt", targetType: "booking", targetId: booking.id });
    return;
  }
  tier.seatsConfirmed += hold.seats;
  booking.status = "confirmed";
  em.create(AuditLog, { action: "booking.confirmed", targetType: "booking", targetId: booking.id });
}
