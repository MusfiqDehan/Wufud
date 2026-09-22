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
      const booking = await em.findOneOrFail(Booking, { id: row.booking.id }, { filters: { softDelete: false } });
      await this.rbac.assertBranchAccess(actor, booking.branch?.id);
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
    // Raw SQL intentionally includes archived financial history. Qualify every
    // table: pooled connections must never depend on a tenant search_path.
    const schema = this.em.schema;
    if (!schema || schema === "public") throw DomainError.forbidden("Tenant schema required.");
    const q = this.em.getPlatform().quoteIdentifier(schema);
    const [stats] = await this.em.getConnection().execute<Array<{
      bookings: number; collected: string; outstanding: string; refunds: string;
      installments_due: string; installments_open: number;
      vendor_costs_sar: string; vendor_costs_bdt: string; expenses_bdt: string;
      stock_issued_cost_bdt: string; pos_collected: string; pos_refunded: string;
    }>>(`
      with pilgrims as (
        select booking_id, count(*) as count from ${q}.booking_pilgrims group by booking_id
      ), charges as (
        select booking_id, sum(charge_amount) as total from ${q}.cancellations group by booking_id
      ), refunds as (
        select booking_id, sum(amount) as total from ${q}.refund_requests where status = 'paid' group by booking_id
      )
      select
        (select count(*) from ${q}.bookings)::int as bookings,
        (select coalesce(sum(amount_received), 0)::numeric(20,2)::text from ${q}.bookings) as collected,
        (select coalesce(sum(greatest(0,
          case when b.status = 'cancelled' then 0
            else b.frozen_price * b.pilgrim_count / greatest(1, coalesce(p.count, 0)) end
          + coalesce(c.total, 0) - b.amount_received + coalesce(r.total, 0)
        )), 0)::numeric(20,2)::text
        from ${q}.bookings b left join pilgrims p on p.booking_id = b.id
          left join charges c on c.booking_id = b.id left join refunds r on r.booking_id = b.id) as outstanding,
        (select coalesce(sum(total), 0)::numeric(20,2)::text from refunds) as refunds,
        (select coalesce(sum(greatest(0, i.amount_due - i.amount_paid - i.amount_waived)), 0)::numeric(20,2)::text
          from ${q}.installments i join ${q}.installment_plans p on p.id = i.plan_id
          join ${q}.bookings b on b.id = p.booking_id
          where i.status in ('open', 'overdue', 'defaulted') and b.status <> 'cancelled') as installments_due,
        (select count(*)::int from ${q}.installments i join ${q}.installment_plans p on p.id = i.plan_id
          join ${q}.bookings b on b.id = p.booking_id
          where i.status in ('open', 'overdue', 'defaulted') and b.status <> 'cancelled') as installments_open,
        (select coalesce(sum(amount_sar), 0)::numeric(20,2)::text from ${q}.vendor_disbursements) as vendor_costs_sar,
        (select coalesce(sum(amount_bdt), 0)::numeric(20,2)::text from ${q}.vendor_disbursements) as vendor_costs_bdt,
        (select coalesce(sum(amount), 0)::numeric(20,2)::text from ${q}.expenses) as expenses_bdt,
        (select coalesce(sum(cost_bdt), 0)::numeric(20,2)::text from ${q}.stock_issues) as stock_issued_cost_bdt,
        (select coalesce(sum(total), 0)::numeric(20,2)::text from ${q}.pos_sales) as pos_collected,
        (select coalesce(sum(total), 0)::numeric(20,2)::text from ${q}.pos_sales where status = 'refunded') as pos_refunded
    `);
    const tiers = await this.em.find(PackageTier, {}, { filters: { softDelete: false } });
    return {
      ...stats,
      quota: tiers.map((t) => ({
        id: t.id, name: t.name, remaining: t.seatsAvailable,
        confirmed: t.seatsConfirmed, held: t.seatsHeld, total: t.seatsTotal,
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
