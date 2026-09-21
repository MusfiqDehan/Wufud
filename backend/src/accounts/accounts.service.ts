import { PosSale } from "./entities/pos.entity";
import { LockMode } from "@mikro-orm/core";
import { positiveMoney, positiveQuantity } from "../shared/validation/business";
import { receivePayment } from "../booking/receive-payment";
import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { DomainError } from "../shared/errors/domain.error";
import { ManualPayment, Payment } from "./entities/payment.entity";
import { Vendor, VendorDisbursement } from "./entities/vendor.entity";
import { StockItem, StockIssue, Expense } from "./entities/stock.entity";
import { DailyBookingStat, SettlementReport, ReconciliationItem, AuditLog } from "./entities/reconciliation.entity";
import { Booking } from "../booking/entities/booking.entity";
import { Cancellation, RefundRequest } from "../booking/entities/cancellation.entity";
import { Installment } from "../booking/entities/installment.entity";
import { PackageTier } from "../booking/entities/package.entity";
import { User } from "../identity/entities/user.entity";
import { applyPaymentToInstallments } from "../booking/installment.util";
import { ListQueryDto } from "../shared/dto/list-query.dto";
import { paginate } from "../shared/pagination/cursor.paginator";
import { RbacService } from "../access/rbac.service";

@Injectable()
export class AccountsService {
  constructor(
    private readonly em: EntityManager,
    private readonly rbac: RbacService,
  ) {}

  async recordManual(actor: User, body: { bookingId: string; amount: string; method?: ManualPayment["method"]; branchId?: string }) {
    positiveMoney(body.amount);
    await this.rbac.assertBranchAccess(actor, body.branchId);
    const booking = await this.em.findOneOrFail(Booking, { id: body.bookingId });
    await this.rbac.assertBranchAccess(actor, booking.branch?.id);
    const row = this.em.create(ManualPayment, {
      booking,
      amount: body.amount,
      method: body.method ?? "cash",
      recordedById: actor.id,
      branch: body.branchId,
      status: "pending",
    });
    await this.em.persistAndFlush(row);
    return row;
  }

  async approveManual(id: string, actor: User) {
    return this.em.transactional(async em => {
      const row = await em.findOneOrFail(ManualPayment, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (row.status !== "pending") throw DomainError.conflict("Only pending payments can be approved.");
      if (row.recordedById === actor.id) throw DomainError.forbidden("Recorder and approver must be different users.");
      const booking = await em.findOneOrFail(Booking, { id: row.booking.id }, { lockMode: LockMode.PESSIMISTIC_WRITE, filters: { softDelete: false } });
      await this.rbac.assertBranchAccess(actor, booking.branch?.id);
      positiveMoney(row.amount);
      row.approvedById = actor.id;
      row.status = "approved";
      await receivePayment(em, booking, Number(row.amount));
      em.create(Payment, { booking, source: "manual", amount: row.amount, currency: booking.currency, createdBy: actor.id });
      em.create(AuditLog, { actorId: actor.id, action: "payment.approve", targetType: "manual_payment", targetId: row.id });
      await em.flush();
      return row;
    });
  }

  async rejectManual(id: string, actor: User, note?: string) {
    return this.em.transactional(async em => {
      const row = await em.findOneOrFail(ManualPayment, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (row.status !== "pending") throw DomainError.conflict("Only pending payments can be rejected.");
      row.status = "rejected";
      row.approvedById = actor.id;
      if (note) (row as unknown as Record<string, unknown>).note = note;
      await em.flush();
      return row;
    });
  }

  listManual(query: ListQueryDto) {
    return paginate(this.em, ManualPayment, {}, { cursor: query.cursor, pageSize: query.page_size, populate: ["booking"] });
  }

  listPayments(query: ListQueryDto) {
    return paginate(this.em, Payment, {}, { cursor: query.cursor, pageSize: query.page_size, populate: ["booking"] });
  }

  async report() {
    // Soft-deleted rows stay in reports: financial history is never hard-deleted,
    // so bypass the default softDelete filter here (lists/detail endpoints keep it).
    const noSoftDelete = { filters: { softDelete: false } } as const;
    const bookings = await this.em.find(Booking, {}, { populate: ["tier", "pilgrims"], ...noSoftDelete });
    const refunds = await this.em.find(RefundRequest, { status: "paid" }, { ...noSoftDelete });
    const tiers = await this.em.find(PackageTier, {}, { ...noSoftDelete });
    const openInstallments = await this.em.find(Installment, { status: { $in: ["open", "overdue", "defaulted"] }, plan: { booking: { status: { $ne: "cancelled" } } } }, { ...noSoftDelete });
    const cancellations = await this.em.find(Cancellation, {}, noSoftDelete);
    const collected = bookings.reduce((s, b) => s + Number(b.amountReceived), 0);
    const outstanding = bookings.reduce((s, b) => {
      const charges = cancellations.filter(c => c.booking.id === b.id).reduce((sum, c) => sum + Number(c.chargeAmount), 0);
      const activeValue = b.status === "cancelled" ? 0 : Number(b.frozenPrice) * b.pilgrimCount / Math.max(1, b.pilgrims.length);
      const paidRefunds = refunds.filter(r => r.booking.id === b.id).reduce((sum, r) => sum + Number(r.amount), 0);
      return s + Math.max(0, activeValue + charges - Number(b.amountReceived) + paidRefunds);
    }, 0);
    const refunded = refunds.reduce((s, r) => s + Number(r.amount), 0);
    const installmentsDue = openInstallments.reduce((s, i) => s + Math.max(0, Number(i.amountDue) - Number(i.amountPaid) - Number(i.amountWaived)), 0);
    const vendors = await this.em.find(VendorDisbursement, {}, noSoftDelete);
    const expenses = await this.em.find(Expense, {}, noSoftDelete);
    const issues = await this.em.find(StockIssue, {}, noSoftDelete);
    const sales = await this.em.find(PosSale, {}, noSoftDelete);
    return {
      vendor_costs_sar: vendors.reduce((s, v) => s + Number(v.amountSar), 0).toFixed(2),
      vendor_costs_bdt: vendors.reduce((s, v) => s + Number(v.amountBdt), 0).toFixed(2),
      expenses_bdt: expenses.reduce((s, e) => s + Number(e.amount), 0).toFixed(2),
      stock_issued_cost_bdt: issues.reduce((s, i) => s + Number(i.costBdt), 0).toFixed(2),
      pos_collected: sales.reduce((s, r) => s + Number(r.total), 0).toFixed(2),
      pos_refunded: sales.filter(r => r.status === "refunded").reduce((s, r) => s + Number(r.total), 0).toFixed(2),
      bookings: bookings.length,
      collected: collected.toFixed(2),
      outstanding: outstanding.toFixed(2),
      refunds: refunded.toFixed(2),
      installments_due: installmentsDue.toFixed(2),
      installments_open: openInstallments.length,
      quota: tiers.map((t) => ({
        id: t.id,
        name: t.name,
        remaining: t.seatsAvailable,
        confirmed: t.seatsConfirmed,
        held: t.seatsHeld,
        total: t.seatsTotal,
      })),
    };
  }

  async snapshot() {
    const stats = await this.report();
    const row = this.em.create(DailyBookingStat, {
      day: new Date(),
      bookingsCount: stats.bookings,
      collected: stats.collected,
      outstanding: stats.outstanding,
    });
    await this.em.persistAndFlush(row);
    return row;
  }

  async createVendor(data: Partial<Vendor>) {
    const v = this.em.create(Vendor, data as Vendor);
    await this.em.persistAndFlush(v);
    return v;
  }

  listVendors(query: ListQueryDto) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (query.search) where.name = { $ilike: `%${query.search}%` };
    return paginate(this.em, Vendor, where, { cursor: query.cursor, pageSize: query.page_size });
  }

  async updateVendor(id: string, data: Partial<Vendor>) {
    const v = await this.em.findOneOrFail(Vendor, { id });
    this.em.assign(v, data);
    await this.em.flush();
    return v;
  }

  async removeVendor(id: string, actorId?: string) {
    const v = await this.em.findOneOrFail(Vendor, { id });
    v.softDelete(actorId);
    await this.em.flush();
  }

  listDisbursements(query: ListQueryDto) {
    return paginate(this.em, VendorDisbursement, {}, { cursor: query.cursor, pageSize: query.page_size, populate: ["vendor", "booking"] });
  }

  async disburse(body: { vendorId: string; bookingId?: string; amountSar: string; fxRate: string; note?: string }) {
    positiveMoney(body.amountSar);
    if (!Number.isFinite(Number(body.fxRate)) || Number(body.fxRate) <= 0) throw DomainError.conflict("FX rate must be positive.");
    const vendor = await this.em.findOneOrFail(Vendor, { id: body.vendorId });
    const amountBdt = (Number(body.amountSar) * Number(body.fxRate)).toFixed(2);
    const row = this.em.create(VendorDisbursement, {
      vendor,
      booking: body.bookingId,
      amountSar: body.amountSar,
      fxRate: body.fxRate,
      amountBdt,
      note: body.note,
    });
    await this.em.persistAndFlush(row);
    return row;
  }

  async issueStock(body: { itemId: string; quantity: number; bookingId?: string }) {
    positiveQuantity(body.quantity);
    return this.em.transactional(async em => {
      const item = await em.findOneOrFail(StockItem, { id: body.itemId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (body.quantity > item.quantity) throw DomainError.conflict("Not enough stock on hand.");
      item.quantity -= body.quantity;
      const issue = em.create(StockIssue, { item, quantity: body.quantity, booking: body.bookingId, costBdt: (Number(item.unitCost) * body.quantity).toFixed(2) });
      await em.persistAndFlush(issue);
      return issue;
    });
  }

  async addExpense(data: Partial<Expense>) {
    positiveMoney(data.amount);
    const e = this.em.create(Expense, { title: data.title, amount: data.amount } as Expense);
    await this.em.persistAndFlush(e);
    return e;
  }

  listStock(query: ListQueryDto) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (query.search) where.name = { $ilike: `%${query.search}%` };
    return paginate(this.em, StockItem, where, { cursor: query.cursor, pageSize: query.page_size });
  }

  async updateStock(id: string, data: Partial<StockItem>) {
    return this.em.transactional(async em => {
      const item = await em.findOneOrFail(StockItem, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (data.quantity !== undefined && (!Number.isSafeInteger(data.quantity) || data.quantity < 0)) throw DomainError.conflict("Stock cannot be negative.");
      em.assign(item, data);
      await em.flush();
      return item;
    });
  }

  async removeStock(id: string, actorId?: string) {
    const item = await this.em.findOneOrFail(StockItem, { id });
    item.softDelete(actorId);
    await this.em.flush();
  }

  listStockIssues(query: ListQueryDto) {
    return paginate(this.em, StockIssue, {}, { cursor: query.cursor, pageSize: query.page_size, populate: ["item", "booking"] });
  }

  listExpenses(query: ListQueryDto) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (query.search) where.title = { $ilike: `%${query.search}%` };
    return paginate(this.em, Expense, where, { cursor: query.cursor, pageSize: query.page_size });
  }

  async updateExpense(id: string, data: Partial<Expense>) {
    const e = await this.em.findOneOrFail(Expense, { id });
    this.em.assign(e, data);
    await this.em.flush();
    return e;
  }

  async removeExpense(id: string, actorId?: string) {
    const e = await this.em.findOneOrFail(Expense, { id });
    e.softDelete(actorId);
    await this.em.flush();
  }

  listSettlements(query: ListQueryDto) {
    return paginate(this.em, SettlementReport, {}, { cursor: query.cursor, pageSize: query.page_size });
  }

  async settlementItems(id: string, query: ListQueryDto) {
    const where: Record<string, unknown> = { report: id };
    if (query.search) where.tranId = { $ilike: `%${query.search}%` };
    return paginate(this.em, ReconciliationItem, where, { cursor: query.cursor, pageSize: query.page_size });
  }

  async resolveReconciliation(id: string, actor: User, note?: string) {
    if (!note?.trim()) throw DomainError.conflict("A resolution note is required.");
    const item = await this.em.findOneOrFail(ReconciliationItem, { id });
    if (item.status !== "mismatch") throw DomainError.conflict("Only mismatches can be resolved.");
    item.status = "resolved";
    if (note !== undefined) item.note = note;
    this.em.create(AuditLog, {
      actorId: actor.id,
      action: "reconciliation.resolve",
      targetType: "reconciliation_item",
      targetId: item.id,
      metadata: { note },
    });
    await this.em.flush();
    return item;
  }

  async importSettlement(body: { gatewaySlug: string; periodStart: string; periodEnd: string; items: { tranId: string; amount: string }[] }) {
    if (!Array.isArray(body.items) || !body.gatewaySlug || !Number.isFinite(Date.parse(body.periodStart)) || !Number.isFinite(Date.parse(body.periodEnd)) || Date.parse(body.periodStart) > Date.parse(body.periodEnd)) throw DomainError.conflict("Provide a valid settlement period and items.");
    if (new Set(body.items.map(i => i.tranId)).size !== body.items.length) throw DomainError.conflict("Duplicate transaction IDs in settlement.");
    const report = this.em.create(SettlementReport, {
      gatewaySlug: body.gatewaySlug,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
    });
    for (const item of body.items) {
      positiveMoney(item.amount);
      const pay = await this.em.findOne(Payment, { tranId: item.tranId, gatewaySlug: body.gatewaySlug }, { filters: { softDelete: false } });
      const match = pay && Math.round(Number(pay.amount) * 100) === Math.round(Number(item.amount) * 100);
      this.em.create(ReconciliationItem, {
        report,
        tranId: item.tranId,
        gatewayAmount: item.amount,
        internalAmount: pay?.amount,
        status: match ? "matched" : "mismatch",
      });
    }
    const internal = await this.em.find(Payment, { gatewaySlug: body.gatewaySlug, createdAt: { $gte: new Date(body.periodStart), $lte: new Date(body.periodEnd) } }, { filters: { softDelete: false } });
    const seen = new Set(body.items.map(i => i.tranId));
    for (const pay of internal) if (pay.tranId && !seen.has(pay.tranId)) this.em.create(ReconciliationItem, { report, tranId: pay.tranId, gatewayAmount: "0.00", internalAmount: pay.amount, status: "mismatch", note: "Internal receipt missing from gateway settlement." });
    await this.em.persistAndFlush(report);
    return report;
  }
}
