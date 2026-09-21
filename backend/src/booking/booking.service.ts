import { MailService } from "../mail/mail.service";
import { Injectable } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { ErrorCode } from "@wufud/contracts";
import { DomainError } from "../shared/errors/domain.error";
import { TravelPackage, PackageTier } from "./entities/package.entity";
import { Booking, BookingPilgrim, SeatHold } from "./entities/booking.entity";
import { Installment, InstallmentPlan } from "./entities/installment.entity";
import { Cancellation, CancellationRule, RefundRequest } from "./entities/cancellation.entity";
import { ListQueryDto } from "../shared/dto/list-query.dto";
import { paginate } from "../shared/pagination/cursor.paginator";
import { User } from "../identity/entities/user.entity";
import { RbacService } from "../access/rbac.service";
import { buildInstallmentSchedule } from "./installment.util";
import { AuditLog } from "../accounts/entities/reconciliation.entity";
import { VendorDisbursement } from "../accounts/entities/vendor.entity";
import { positiveMoney } from "../shared/validation/business";
import { Payment } from "../accounts/entities/payment.entity";

@Injectable()
export class BookingService {
  constructor(
    private readonly em: EntityManager,
    private readonly rbac: RbacService,
    private readonly mail: MailService,
  ) {}

  private validatePackageDates(data: Partial<TravelPackage>) {
    const opens = new Date(data.bookingOpensAt!).getTime();
    const closes = new Date(data.bookingClosesAt!).getTime();
    const departure = new Date(data.departureDate!).getTime();
    if (![opens, closes, departure].every(Number.isFinite) || opens >= closes || closes > departure) throw DomainError.conflict("Booking must open before it closes, and close by departure.");
  }

  listPackages(query: ListQueryDto, publishedOnly = false) {
    const where: Record<string, unknown> = {};
    if (publishedOnly) where.isPublished = true;
    if (query.search) where.name = { $ilike: `%${query.search}%` };
    return paginate(this.em, TravelPackage, where, { cursor: query.cursor, pageSize: query.page_size, populate: ["tiers"] });
  }

  async createPackage(data: Partial<TravelPackage> & { tiers?: Partial<PackageTier>[] }, actor: User) {
    if (!data.tiers?.length) throw DomainError.conflict("A package requires at least one tier.");
    this.validatePackageDates(data);
    if (data.maxPilgrims !== undefined) {
      if (!Number.isInteger(data.maxPilgrims) || data.maxPilgrims < 1 || data.maxPilgrims > 100) {
        throw DomainError.conflict("Maximum pilgrims must be an integer between 1 and 100.");
      }
    }
    const { tiers, ...fields } = data;
    const pkg = this.em.create(TravelPackage, { ...fields, createdBy: actor.id } as TravelPackage);
    for (const t of data.tiers ?? []) {
      this.em.create(PackageTier, { ...t, package: pkg } as PackageTier);
    }
    await this.em.persistAndFlush(pkg);
    return pkg;
  }

  async getPackage(id: string) {
    return this.em.findOneOrFail(TravelPackage, { id }, { populate: ["tiers"] });
  }

  async updatePackage(id: string, data: Partial<TravelPackage>, actor: User) {
    const pkg = await this.em.findOneOrFail(TravelPackage, { id });
    this.validatePackageDates({ ...pkg, ...data });
    if (data.maxPilgrims !== undefined) {
      if (!Number.isInteger(data.maxPilgrims) || data.maxPilgrims < 1 || data.maxPilgrims > 100) {
        throw DomainError.conflict("Maximum pilgrims must be an integer between 1 and 100.");
      }
    }
    this.em.assign(pkg, { ...data, updatedBy: actor.id } as Partial<TravelPackage>);
    await this.em.flush();
    return this.getPackage(id);
  }

  async removePackage(id: string, actor: User) {
    const pkg = await this.em.findOneOrFail(TravelPackage, { id });
    pkg.softDelete(actor.id);
    await this.em.flush();
  }

  async addTier(packageId: string, data: Partial<PackageTier>) {
    const pkg = await this.em.findOneOrFail(TravelPackage, { id: packageId });
    const tier = this.em.create(PackageTier, { ...data, package: pkg } as PackageTier);
    await this.em.persistAndFlush(tier);
    return tier;
  }

  async updateTier(tierId: string, data: Partial<PackageTier>) {
    return this.em.transactional(async em => {
      const tier = await em.findOneOrFail(PackageTier, { id: tierId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (data.seatsTotal !== undefined) {
        if (!Number.isInteger(data.seatsTotal) || data.seatsTotal < tier.seatsConfirmed + tier.seatsHeld) throw new DomainError(ErrorCode.QUOTA_BELOW_CONFIRMED, "Quota cannot be below confirmed and held seats.", 409);
        tier.seatsTotal = data.seatsTotal;
      }
      if (data.price !== undefined) { positiveMoney(data.price); tier.price = data.price; }
      if (data.name !== undefined) tier.name = data.name;
      await em.flush();
      return tier;
    });
  }

  async removeTier(tierId: string, actor: User) {
    const tier = await this.em.findOneOrFail(PackageTier, { id: tierId });
    if (tier.seatsConfirmed > 0 || tier.seatsHeld > 0) {
      throw new DomainError(ErrorCode.SEAT_UNAVAILABLE, "Tier has active seats and cannot be deleted.", 409);
    }
    tier.softDelete(actor.id);
    await this.em.flush();
  }

  async updateTierQuota(tierId: string, seatsTotal: number) {
    return this.updateTier(tierId, { seatsTotal });
  }

  async createBooking(
    actor: User,
    input: {
      tierId: string;
      paymentMode: "full" | "installment";
      pilgrims: { fullName: string; passportNumber: string; nationality?: string }[];
      branchId?: string;
    },
  ) {
    await this.rbac.assertBranchAccess(actor, input.branchId);
    if (!Array.isArray(input.pilgrims) || !input.pilgrims.length || input.pilgrims.length > 100 || !["full", "installment"].includes(input.paymentMode)) throw DomainError.conflict("Choose a payment mode and at least 1 pilgrim (up to 100).");
    for (const p of input.pilgrims) {
      if (typeof p.fullName !== "string" || !p.fullName.trim() || typeof p.passportNumber !== "string" || !p.passportNumber.trim()) throw DomainError.conflict("Each pilgrim requires a name and passport number.");
    }
    if (new Set(input.pilgrims.map(p => p.passportNumber.trim().toUpperCase())).size !== input.pilgrims.length) throw DomainError.conflict("Passport numbers must be unique within a booking.");
    const n = input.pilgrims.length;
    return this.em.transactional(async (em) => {
      const tier = await em.findOneOrFail(PackageTier, { id: input.tierId }, {
        populate: ["package"],
        lockMode: LockMode.PESSIMISTIC_WRITE,
      });
      const now = new Date();
      if (!tier.package.isPublished || !tier.package.isActive || now < new Date(tier.package.bookingOpensAt) || now >= new Date(tier.package.bookingClosesAt) || now >= new Date(tier.package.departureDate)) throw DomainError.conflict("This package is outside its booking window.");
      const maxPilgrims = tier.package.maxPilgrims || 10;
      if (n > maxPilgrims) {
        throw DomainError.conflict(`This package allows a maximum of ${maxPilgrims} pilgrims per booking.`);
      }
      if (tier.seatsAvailable < n) {
        throw new DomainError(ErrorCode.SEAT_UNAVAILABLE, undefined, 409);
      }
      const total = (Number(tier.price) * n).toFixed(2);
      const expires = new Date(Date.now() + Math.max(1, Number(process.env.BOOKING_HOLD_MINUTES) || 30) * 60 * 1000);
      const booking = em.create(Booking, {
        userId: actor.id,
        tier,
        branch: input.branchId,
        status: "held",
        frozenPrice: total,
        currency: tier.currency,
        pilgrimCount: n,
        paymentMode: input.paymentMode,
        holdExpiresAt: expires,
        createdBy: actor.id,
      });
      for (const p of input.pilgrims) {
        em.create(BookingPilgrim, { booking, fullName: p.fullName.trim(), passportNumber: p.passportNumber.trim().toUpperCase(), nationality: p.nationality });
      }
      em.create(SeatHold, { tier, booking, seats: n, expiresAt: expires, isOpen: true });
      tier.seatsHeld += n;
      let downPayment = total;
      if (input.paymentMode === "installment") {
        const schedule = buildInstallmentSchedule(Number(total), 0.3, 3, new Date(), tier.package.departureDate);
        downPayment = schedule[0].amount.toFixed(2);
        const plan = em.create(InstallmentPlan, { booking, downPayment });
        for (const s of schedule) {
          em.create(Installment, {
            plan,
            sequence: s.sequence,
            dueDate: s.dueDate,
            amountDue: s.amount.toFixed(2),
          });
        }
      }
      em.create(AuditLog, { actorId: actor.id, action: "booking.create", targetType: "booking", targetId: booking.id });
      await em.flush();
      booking.downPayment = downPayment;
      return booking;
    });
  }

  async listBookings(query: ListQueryDto, user: User, ownOnly = false) {
    const where: Record<string, unknown> = {};
    if (ownOnly) where.userId = user.id;
    const scope = await this.rbac.getBranchScopeIds(user);
    if (scope) where.branch = { $in: scope };
    if (query.search) where.id = { $ilike: `%${query.search}%` };
    return paginate(this.em, Booking, where, { cursor: query.cursor, pageSize: query.page_size, populate: ["tier.package", "pilgrims"] });
  }

  async myBookingDetail(id: string, user: User) {
    const booking = await this.em.findOneOrFail(Booking, { id, userId: user.id }, { populate: ["tier.package", "pilgrims"] });
    const plan = await this.em.findOne(InstallmentPlan, { booking: id }, { populate: ["installments"] });
    const payments = await this.em.find(Payment, { booking: id });
    return { ...booking, installments: plan?.installments ?? [], payments } as unknown as Booking & { installments: unknown[]; payments: unknown[] };
  }

  async getBooking(id: string) {
    const booking = await this.em.findOneOrFail(Booking, { id }, { populate: ["tier.package", "pilgrims"] });
    const plan = await this.em.findOne(InstallmentPlan, { booking: id }, { populate: ["installments"] });
    const payments = await this.em.find(Payment, { booking: id });
    return { ...booking, installments: plan?.installments ?? [], payments } as unknown as Booking & { installments: unknown[]; payments: unknown[] };
  }

  async updateBooking(id: string, actor: User, data: { status?: Booking["status"] }) {
    const booking = await this.em.findOneOrFail(Booking, { id });
    if (data.status && data.status !== booking.status) throw DomainError.conflict("Use payment, cancellation or overdue workflows to change booking status.");
    booking.updatedBy = actor.id;
    await this.em.flush();
    return booking;
  }

  async removeBooking(id: string, actor: User) {
    const booking = await this.em.findOneOrFail(Booking, { id });
    // Financial records are never hard-deleted: soft-delete keeps the row for reports/reconciliation.
    booking.softDelete(actor.id);
    await this.em.flush();
  }

  async listInstallments(bookingId: string): Promise<Installment[]> {
    const plan = await this.em.findOneOrFail(InstallmentPlan, { booking: bookingId }, { populate: ["installments"] });
    return [...plan.installments].sort((a, b) => a.sequence - b.sequence);
  }

  async listPilgrims(query: ListQueryDto, bookingId?: string) {
    const where: Record<string, unknown> = {};
    if (bookingId) where.booking = bookingId;
    if (query.search) where.fullName = { $ilike: `%${query.search}%` };
    return paginate(this.em, BookingPilgrim, where, { cursor: query.cursor, pageSize: query.page_size, populate: ["booking"] });
  }

  async listCancellationRules() {
    return this.em.find(CancellationRule, { isDeleted: false }, { orderBy: { daysBeforeDeparture: "DESC" } });
  }

  async upsertCancellationRule(data: Partial<CancellationRule>, actor: User) {
    if (data.id) {
      const row = await this.em.findOneOrFail(CancellationRule, { id: data.id as string });
      this.em.assign(row, { ...data, updatedBy: actor.id });
      await this.em.flush();
      return row;
    }
    const row = this.em.create(CancellationRule, { ...data, createdBy: actor.id } as CancellationRule);
    await this.em.persistAndFlush(row);
    return row;
  }

  async removeCancellationRule(id: string, actor: User) {
    const row = await this.em.findOneOrFail(CancellationRule, { id });
    row.softDelete(actor.id);
    await this.em.flush();
  }

  async tenantAudit(query: ListQueryDto) {
    return paginate(this.em, AuditLog, {}, { cursor: query.cursor, pageSize: query.page_size });
  }

  async cancel(bookingId: string, actor: User, pilgrimIds?: string[]) {
    return this.em.transactional(async em => {
      const booking = await em.findOneOrFail(Booking, { id: bookingId }, { populate: ["pilgrims", "tier.package"], lockMode: LockMode.PESSIMISTIC_WRITE });
      await this.rbac.assertBranchAccess(actor, booking.branch?.id);
      if (booking.status === "cancelled") throw DomainError.conflict("Booking is already cancelled.");
      const tier = await em.findOneOrFail(PackageTier, { id: booking.tier.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      const active = [...booking.pilgrims].filter(p => !p.cancelled);
      const targets = pilgrimIds?.length ? active.filter(p => pilgrimIds.includes(p.id)) : active;
      if (!targets.length || (pilgrimIds?.length && targets.length !== new Set(pilgrimIds).size)) throw DomainError.conflict("Choose active pilgrims belonging to this booking.");
      const days = Math.floor((new Date(tier.package.departureDate).getTime() - Date.now()) / 86400000);
      const rules = await em.find(CancellationRule, {}, { orderBy: { daysBeforeDeparture: "DESC" } });
      const rule = rules.find(r => days >= r.daysBeforeDeparture);
      const vendors = await em.find(VendorDisbursement, { booking: booking.id }, { filters: { softDelete: false } });
      const originalCount = booking.pilgrims.length;
      const fraction = targets.length / originalCount;
      const charge = Number(booking.frozenPrice) * fraction * Number(rule?.chargePercent ?? 10) / 100 + vendors.reduce((sum, v) => sum + Number(v.amountBdt), 0) * fraction;
      // Retain original installment amounts/dates; record cancellation credits separately.
      let credit = Math.max(0, Number(booking.frozenPrice) * fraction - charge);
      const installments = await em.find(Installment, { plan: { booking: booking.id } }, { orderBy: { sequence: "DESC" } });
      for (const inst of installments) {
        const waived = Math.min(credit, Math.max(0, Number(inst.amountDue) - Number(inst.amountPaid) - Number(inst.amountWaived)));
        inst.amountWaived = (Number(inst.amountWaived) + waived).toFixed(2);
        credit -= waived;
        if (Number(inst.amountPaid) + Number(inst.amountWaived) >= Number(inst.amountDue)) inst.status = "paid";
      }
      const hold = await em.findOne(SeatHold, { booking: booking.id, isOpen: true });
      if (hold) {
        tier.seatsHeld -= targets.length;
        hold.seats -= targets.length;
        if (!hold.seats) hold.isOpen = false;
      } else if (["confirmed", "defaulted"].includes(booking.status)) tier.seatsConfirmed -= targets.length;
      for (const p of targets) p.cancelled = true;
      booking.pilgrimCount -= targets.length;
      if (!booking.pilgrimCount) booking.status = "cancelled";
      em.create(Cancellation, { booking, chargeAmount: charge.toFixed(2), isPartial: booking.pilgrimCount > 0, createdBy: actor.id });
      em.create(AuditLog, { actorId: actor.id, action: "booking.cancel", targetType: "booking", targetId: booking.id, metadata: { pilgrimIds: targets.map(p => p.id), charge: charge.toFixed(2) } });
      await em.flush();
      return booking;
    });
  }

  async requestRefund(bookingId: string, amount: string, actor: User) {
    positiveMoney(amount);
    return this.em.transactional(async em => {
      const booking = await em.findOneOrFail(Booking, { id: bookingId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      await this.rbac.assertBranchAccess(actor, booking.branch?.id);
      const claims = await em.find(RefundRequest, { booking: bookingId, status: { $ne: "rejected" } }, { filters: { softDelete: false } });
      const claimed = claims.reduce((sum, r) => sum + Number(r.amount), 0);
      const charges = await em.find(Cancellation, { booking: bookingId }, { filters: { softDelete: false } });
      const charge = charges.reduce((sum, r) => sum + Number(r.chargeAmount), 0);
      if (Math.round((Number(amount) + claimed + charge) * 100) > Math.round(Number(booking.amountReceived) * 100)) throw new DomainError(ErrorCode.REFUND_EXCEEDS_RECEIVED, undefined, 409);
      const refund = em.create(RefundRequest, { booking, amount, createdBy: actor.id });
      em.create(AuditLog, { actorId: actor.id, action: "refund.request", targetType: "refund", targetId: refund.id });
      await em.persistAndFlush(refund);
      return refund;
    });
  }

  async processRefund(id: string, status: RefundRequest["status"], actor: User) {
    return this.em.transactional(async em => {
      const refund = await em.findOneOrFail(RefundRequest, { id }, { populate: ["booking"], lockMode: LockMode.PESSIMISTIC_WRITE });
      await this.rbac.assertBranchAccess(actor, refund.booking.branch?.id);
      if (refund.status === status) return refund;
      const transitions: Record<string, string[]> = { requested: ["approved", "rejected"], approved: ["processing", "rejected"], processing: ["paid"], paid: [], rejected: [] };
      if (!transitions[refund.status]?.includes(status)) throw DomainError.conflict("Invalid refund transition.");
      refund.status = status;
      if (status === "approved") refund.approvedById = actor.id;
      em.create(AuditLog, { actorId: actor.id, action: `refund.${status}`, targetType: "refund", targetId: refund.id });
      await em.flush();
      return refund;
    });
  }

  async releaseExpiredHolds() {
    const holds = await this.em.find(SeatHold, { isOpen: true, expiresAt: { $lt: new Date() } }, { filters: { softDelete: false } });
    let released = 0;
    for (const candidate of holds) await this.em.transactional(async em => {
      const booking = await em.findOneOrFail(Booking, { id: candidate.booking.id }, { lockMode: LockMode.PESSIMISTIC_WRITE, filters: { softDelete: false } });
      const tier = await em.findOneOrFail(PackageTier, { id: candidate.tier.id }, { lockMode: LockMode.PESSIMISTIC_WRITE, filters: { softDelete: false } });
      const hold = await em.findOneOrFail(SeatHold, { id: candidate.id }, { refresh: true });
      if (!hold.isOpen) return;
      hold.isOpen = false;
      tier.seatsHeld -= hold.seats;
      if (booking.status === "held") booking.status = "cancelled";
      em.create(AuditLog, { action: "booking.hold_expired", targetType: "booking", targetId: booking.id });
      await em.flush();
      released++;
    });
    return released;
  }

  async markOverdue(graceDays = Math.max(0, Number(process.env.INSTALLMENT_GRACE_DAYS ?? 7))) {
    const now = new Date();
    const items = await this.em.find(Installment, { status: { $in: ["open", "overdue", "defaulted"] }, dueDate: { $lt: now } }, { populate: ["plan.booking"] });
    let overdue = 0;
    const defaulted = new Set<string>();
    for (const candidate of items) {
      await this.em.transactional(async em => {
        const booking = await em.findOneOrFail(Booking, { id: candidate.plan.booking.id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
        const i = await em.findOneOrFail(Installment, { id: candidate.id }, { refresh: true });
        if (booking.status === "cancelled" || i.status === "paid") return;
        if (i.status === "open") { i.status = "overdue"; overdue++; }
        if (i.dueDate.getTime() < now.getTime() - graceDays * 86400000) {
          i.status = "defaulted";
          if (booking.status === "confirmed") {
            booking.status = "defaulted";
            defaulted.add(booking.id);
            em.create(AuditLog, { action: "booking.defaulted", targetType: "booking", targetId: booking.id });
          }
        }
        await em.flush();
      });
      const installment = await this.em.findOneOrFail(Installment, { id: candidate.id }, { populate: ["plan.booking"], refresh: true });
      const booking = installment.plan.booking;
      if (booking.status === "cancelled" || installment.status === "paid") continue;
      const action = `installment.reminder.${now.toISOString().slice(0, 10)}`;
      if (await this.em.findOne(AuditLog, { action, targetId: installment.id })) continue;
      const user = await this.em.findOne(User, { id: booking.userId });
      if (!user?.email) continue;
      const sent = await this.mail.send({ to: user.email, plane: "tenant", subject: "Installment payment reminder", text: `Your booking ${booking.id} has an overdue installment of ${(Number(installment.amountDue) - Number(installment.amountPaid) - Number(installment.amountWaived)).toFixed(2)} ${booking.currency}. Please sign in to review your payment schedule.`, html: "<p>Please sign in to review your overdue installment and payment schedule.</p>" });
      if (sent.sent) { this.em.create(AuditLog, { action, targetType: "installment", targetId: installment.id }); await this.em.flush(); }
    }
    return { overdue, defaulted: defaulted.size };
  }
}
