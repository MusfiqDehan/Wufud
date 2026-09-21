import { RbacService } from "../access/rbac.service";
import { Cancellation, RefundRequest } from "../booking/entities/cancellation.entity";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { LockMode } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { RequireFeature } from "../access/require-feature.guard";
import { CurrentUser } from "../shared/decorators/current-user.decorator";
import { User } from "../identity/entities/user.entity";
import { StockItem, StockIssue } from "./entities/stock.entity";
import { PosSale } from "./entities/pos.entity";
import { AuditLog } from "./entities/reconciliation.entity";
import { Payment, ManualPayment } from "./entities/payment.entity";
import { Booking } from "../booking/entities/booking.entity";
import { InstallmentPlan } from "../booking/entities/installment.entity";
import { receivePayment } from "../booking/receive-payment";
import { DomainError } from "../shared/errors/domain.error";
import { positiveMoney, positiveQuantity } from "../shared/validation/business";
import { listSuccessResponse, successResponse } from "../shared/interceptors/success.interceptor";
import { paginate } from "../shared/pagination/cursor.paginator";
import { ListQueryDto } from "../shared/dto/list-query.dto";

@Controller("api/v1/pos")
export class PosController {
  constructor(private readonly em: EntityManager, private readonly rbac: RbacService) {}

  @Get("catalog") @RequireFeature("pos", "view")
  async catalog(@Query() query: ListQueryDto) {
    const page = await paginate(this.em, StockItem, {}, { cursor: query.cursor, pageSize: query.page_size });
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("catalog") @RequireFeature("pos", "full")
  async item(@Body() body: { name: string; kind: "product" | "service"; salePrice: string; quantity: number }, @CurrentUser() actor: User) {
    positiveMoney(body.salePrice);
    if (!body.name?.trim() || !["product", "service"].includes(body.kind) || !Number.isSafeInteger(body.quantity) || body.quantity < 0) throw DomainError.conflict("Provide a name, product or service type, and non-negative stock.");
    const item = this.em.create(StockItem, { name: body.name.trim(), kind: body.kind, salePrice: body.salePrice, quantity: body.kind === "service" ? 0 : body.quantity, createdBy: actor.id });
    this.em.create(AuditLog, { actorId: actor.id, action: "pos.catalog.create", targetType: "stock", targetId: item.id });
    await this.em.persistAndFlush(item);
    return successResponse(item);
  }

  @Patch("catalog/:id") @RequireFeature("pos", "edit")
  async updateItem(
    @Param("id") id: string,
    @Body() body: { name?: string; salePrice?: string; quantity?: number; kind?: "product" | "service" },
    @CurrentUser() actor: User,
  ) {
    return this.em.transactional(async em => {
      const item = await em.findOneOrFail(StockItem, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (body.salePrice !== undefined) { positiveMoney(body.salePrice); item.salePrice = body.salePrice; }
      if (body.name !== undefined) {
        if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 255) throw DomainError.conflict("Enter an item name.");
        item.name = body.name.trim();
      }
      if (body.kind !== undefined && body.kind !== item.kind) throw DomainError.conflict("Archive this item and create a new one to change product/service type.");
      if (body.quantity !== undefined) {
        if (!Number.isSafeInteger(body.quantity) || body.quantity < 0) throw DomainError.conflict("Stock must be a non-negative whole number.");
        if (item.kind === "product") item.quantity = body.quantity;
      }
      em.create(AuditLog, { actorId: actor.id, action: "pos.catalog.update", targetType: "stock", targetId: item.id });
      await em.flush();
      return successResponse(item);
    });
  }

  @Delete("catalog/:id") @RequireFeature("pos", "full")
  async deleteItem(@Param("id") id: string, @CurrentUser() actor: User) {
    const item = await this.em.findOneOrFail(StockItem, { id });
    item.softDelete(actor.id);
    this.em.create(AuditLog, { actorId: actor.id, action: "pos.catalog.delete", targetType: "stock", targetId: item.id });
    await this.em.flush();
    return successResponse({ ok: true });
  }

  @Get("sales") @RequireFeature("pos", "view")
  async sales(@Query() query: ListQueryDto) {
    const page = await paginate(this.em, PosSale, {}, { cursor: query.cursor, pageSize: query.page_size, filters: { softDelete: false } });
    return listSuccessResponse(page.items, page.pagination);
  }

  @Post("sales") @RequireFeature("pos", "edit")
  async checkout(
    @Body() body: {
      requestKey: string;
      lines: { itemId: string; quantity: number }[];
      paymentMethod?: string;
      amountTendered?: number;
      customerName?: string;
      customerPhone?: string;
    },
    @CurrentUser() actor: User,
  ): Promise<any> {
    if (!body.requestKey || body.requestKey.length > 100 || !Array.isArray(body.lines) || !body.lines.length || body.lines.length > 100) {
      throw DomainError.conflict("A request key and cart are required.");
    }
    const quantities = new Map<string, number>();
    for (const line of body.lines) quantities.set(line.itemId, (quantities.get(line.itemId) ?? 0) + positiveQuantity(line.quantity));

    return this.em.transactional(async em => {
      // Stable advisory lock also serializes retries before a sale row exists.
      await em.getConnection().execute("select pg_advisory_xact_lock(hashtext(current_schema()), hashtext(?))", [body.requestKey], "all", em.getTransactionContext());
      const existing = await em.findOne(PosSale, { requestKey: body.requestKey }, { filters: { softDelete: false } });
      if (existing) {
        if (existing.lines.length !== quantities.size || existing.lines.some(line => quantities.get(line.itemId) !== line.quantity)) {
          throw DomainError.conflict("This checkout key was already used for a different cart.");
        }
        return successResponse(existing);
      }

      const lines: (PosSale["lines"][number] & { stockIssueId?: string })[] = [];
      let cents = 0;
      for (const [id, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
        const item = await em.findOneOrFail(StockItem, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
        positiveMoney(item.salePrice);
        let stockIssueId: string | undefined = undefined;
        if (item.kind === "product") {
          if (item.quantity < quantity) throw DomainError.conflict(`Not enough stock: ${item.name}`);
          item.quantity -= quantity;
          const costBdt = (Number(item.unitCost || 0) * quantity).toFixed(2);
          const issue = em.create(StockIssue, {
            item,
            quantity,
            costBdt,
            createdBy: actor.id,
          });
          stockIssueId = issue.id;
        }
        cents += Math.round(Number(item.salePrice) * 100) * quantity;
        lines.push({ itemId: id, name: item.name, kind: item.kind, quantity, unitPrice: item.salePrice, stockIssueId });
      }

      const total = (cents / 100).toFixed(2);
      if (body.amountTendered !== undefined && (!Number.isFinite(body.amountTendered) || body.amountTendered < Number(total))) throw DomainError.conflict("Amount tendered must cover the sale total.");
      const sale = em.create(PosSale, { requestKey: body.requestKey, lines, total, createdBy: actor.id });
      em.create(AuditLog, {
        actorId: actor.id,
        action: "pos.sale",
        targetType: "pos_sale",
        targetId: sale.id,
        metadata: { total, itemCount: lines.length, paymentMethod: body.paymentMethod || "cash" },
      });
      await em.flush();

      const receipt = {
        type: "sale" as const,
        receiptNumber: `POS-${sale.id.toUpperCase()}`,
        saleId: sale.id,
        createdAt: sale.createdAt,
        cashierName: actor.fullName || actor.email || "Counter Cashier",
        cashierId: actor.id,
        customerName: body.customerName?.trim() || "Walk-in Pilgrim",
        customerPhone: body.customerPhone?.trim() || "",
        paymentMethod: body.paymentMethod || "cash",
        total: sale.total,
        amountTendered: body.amountTendered !== undefined ? Number(body.amountTendered) : Number(sale.total),
        changeDue: Math.max(0, (body.amountTendered !== undefined ? Number(body.amountTendered) : Number(sale.total)) - Number(sale.total)).toFixed(2),
        items: lines,
      };

      sale.receipt = receipt;
      await em.flush();
      return successResponse({ ...sale, receipt });
    });
  }

  @Post("sales/:id/refund") @RequireFeature("pos", "full")
  async refund(@Param("id") id: string, @CurrentUser() actor: User): Promise<any> {
    return this.em.transactional(async em => {
      const sale = await em.findOneOrFail(PosSale, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (sale.status === "refunded") return successResponse(sale);

      for (const line of [...sale.lines].sort((a, b) => a.itemId.localeCompare(b.itemId))) {
        if (line.kind !== "product") continue;
        const item = await em.findOneOrFail(StockItem, { id: line.itemId }, { lockMode: LockMode.PESSIMISTIC_WRITE, filters: { softDelete: false } });
        item.quantity += line.quantity;

        // A return is a separate cost reversal; retain the original issue in reports.
        const issueId = line.stockIssueId;
        if (issueId) {
          const issue = await em.findOneOrFail(StockIssue, { id: issueId }, { filters: { softDelete: false } });
          em.create(StockIssue, { item, quantity: -issue.quantity, costBdt: (-Number(issue.costBdt)).toFixed(2), reversalOf: issue.id, createdBy: actor.id });
        }
      }

      sale.status = "refunded";
      sale.updatedBy = actor.id;
      em.create(AuditLog, { actorId: actor.id, action: "pos.refund", targetType: "pos_sale", targetId: sale.id, metadata: { amount: sale.total } });
      await em.flush();

      const refundReceipt = {
        type: "refund" as const,
        receiptNumber: `REF-${sale.id.toUpperCase()}`,
        saleId: sale.id,
        createdAt: new Date().toISOString(),
        cashierName: actor.fullName || actor.email || "Counter Cashier",
        cashierId: actor.id,
        amountRefunded: sale.total,
        originalSaleTotal: sale.total,
        status: "refunded",
        items: sale.lines,
      };

      sale.refundReceipt = refundReceipt;
      await em.flush();
      return successResponse({ ...sale, refundReceipt });
    });
  }

  @Get("bookings") @RequireFeature("pos", "view")
  async listActiveBookings(@Query("search") search: string | undefined, @CurrentUser() actor: User): Promise<any> {
    const scope = await this.rbac.getBranchScopeIds(actor);
    const qb = this.em.createQueryBuilder(Booking, "b")
      .select(["b.id", "b.status", "b.frozenPrice", "b.amountReceived", "b.currency", "b.paymentMode", "b.pilgrimCount", "b.createdAt"])
      .leftJoinAndSelect("b.tier", "tier")
      .leftJoinAndSelect("tier.package", "pkg")
      .leftJoinAndSelect("b.pilgrims", "pilgrim")
      .where({ status: { $ne: "cancelled" }, ...(scope ? { branch: { $in: scope } } : {}) })
      .orderBy({ "b.createdAt": "DESC" })
      .limit(60);

    const bookings = await qb.getResultList();

    const results = await Promise.all(
      bookings.map(async (b) => {
        const plan = await this.em.findOne(InstallmentPlan, { booking: b.id }, { populate: ["installments"] });
        const installments = plan
          ? [...plan.installments]
              .sort((x, y) => x.sequence - y.sequence)
              .map(i => ({
                id: i.id,
                sequence: i.sequence,
                dueDate: i.dueDate,
                amountDue: i.amountDue,
                amountPaid: i.amountPaid,
                amountWaived: i.amountWaived,
                status: i.status,
              }))
          : [];
        const cancellations = await this.em.find(Cancellation, { booking: b.id }, { filters: { softDelete: false } });
        const refunds = await this.em.find(RefundRequest, { booking: b.id, status: "paid" }, { filters: { softDelete: false } });
        const totalDue = Number(b.frozenPrice) * b.pilgrimCount / Math.max(1, b.pilgrims.length) + cancellations.reduce((sum, c) => sum + Number(c.chargeAmount), 0) + refunds.reduce((sum, r) => sum + Number(r.amount), 0);
        const totalPaid = Number(b.amountReceived);
        const remainingBalance = Math.max(0, totalDue - totalPaid).toFixed(2);
        const nextOpenInstallment = installments.find(i => ["open", "overdue", "defaulted"].includes(i.status));

        return {
          id: b.id,
          status: b.status,
          frozenPrice: b.frozenPrice,
          amountReceived: b.amountReceived,
          remainingBalance,
          currency: b.currency,
          paymentMode: b.paymentMode,
          tierName: b.tier?.name || "Standard Tier",
          packageName: b.tier?.package?.name || "Pilgrimage Package",
          pilgrims: b.pilgrims.getItems().map(p => ({ id: p.id, fullName: p.fullName, passportNumber: p.passportNumber })),
          primaryPilgrim: b.pilgrims.getItems()[0]?.fullName || "Primary Pilgrim",
          installments,
          nextOpenInstallment,
        };
      }),
    );

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      const filtered = results.filter(
        r =>
          r.id.toLowerCase().includes(s) ||
          r.primaryPilgrim.toLowerCase().includes(s) ||
          r.packageName.toLowerCase().includes(s) ||
          r.pilgrims.some(p => p.fullName.toLowerCase().includes(s) || p.passportNumber.toLowerCase().includes(s)),
      );
      return listSuccessResponse(filtered, { total: filtered.length, hasNext: false, cursor: null } as any);
    }

    return listSuccessResponse(results, { total: results.length, hasNext: false, cursor: null } as any);
  }

  @Post("installments") @RequireFeature("pos", "edit")
  async collectInstallment(
    @Body() body: {
      bookingId: string;
      requestKey: string;
      amount: string;
      method?: "cash" | "card" | "bkash" | "nagad" | "bank_transfer";
      tendered?: number;
      note?: string;
    },
    @CurrentUser() actor: User,
  ): Promise<any> {
    if (!body.requestKey || typeof body.requestKey !== "string" || body.requestKey.length > 100) throw DomainError.conflict("A collection request key is required.");
    if (!body.bookingId) throw DomainError.conflict("Booking ID is required.");
    positiveMoney(body.amount);
    const amountNum = Number(body.amount);
    if (body.tendered !== undefined && (!Number.isFinite(body.tendered) || body.tendered < amountNum)) throw DomainError.conflict("Amount tendered must cover the collection.");
    if (body.method && !["cash", "card", "bkash", "nagad", "bank_transfer"].includes(body.method)) throw DomainError.conflict("Choose a supported payment method.");
    if (amountNum <= 0) throw DomainError.conflict("Payment amount must be greater than zero.");

    return this.em.transactional(async em => {
      await em.getConnection().execute("select pg_advisory_xact_lock(hashtext(current_schema()), hashtext(?))", [`collection:${body.requestKey}`], "all", em.getTransactionContext());
      const existing = await em.findOne(ManualPayment, { requestKey: body.requestKey }, { filters: { softDelete: false } });
      if (existing) {
        if (existing.booking.id !== body.bookingId || Number(existing.amount) !== amountNum || existing.recordedById !== actor.id) throw DomainError.conflict("This collection key was already used.");
        return successResponse({ ok: true, manualPayment: existing, receipt: { ...existing.receipt, approvalStatus: existing.status } });
      }
      const booking = await em.findOneOrFail(
        Booking,
        { id: body.bookingId },
        { lockMode: LockMode.PESSIMISTIC_WRITE, populate: ["tier", "tier.package", "pilgrims", "branch"] },
      );

      if (booking.status === "cancelled") throw DomainError.conflict("Cannot collect installment on cancelled booking.");

      await this.rbac.assertBranchAccess(actor, booking.branch?.id);
      const previousReceived = booking.amountReceived;

      const paymentMethod = body.method || "cash";
      const payment = em.create(ManualPayment, {
        booking, branch: booking.branch, amount: body.amount, method: paymentMethod,
        recordedById: actor.id, status: "pending", requestKey: body.requestKey, createdBy: actor.id,
      });
      const tranId = `POS-INST-${payment.id}`;

      em.create(AuditLog, {
        actorId: actor.id,
        action: "pos.installment.collection",
        targetType: "booking",
        targetId: booking.id,
        metadata: {
          amount: body.amount,
          method: paymentMethod,
          tranId,
          previousReceived,
          newReceived: booking.amountReceived,
        },
      });

      await em.flush();

      const plan = await em.findOne(InstallmentPlan, { booking: booking.id }, { populate: ["installments"] });
      const updatedInstallments = plan
        ? [...plan.installments]
            .sort((x, y) => x.sequence - y.sequence)
            .map(i => ({
              id: i.id,
              sequence: i.sequence,
              dueDate: i.dueDate,
              amountDue: i.amountDue,
              amountPaid: i.amountPaid,
              status: i.status,
            }))
        : [];

      const tendered = body.tendered !== undefined ? Number(body.tendered) : amountNum;
      const changeDue = Math.max(0, tendered - amountNum).toFixed(2);
      const cancellations = await em.find(Cancellation, { booking: booking.id }, { filters: { softDelete: false } });
      const refunds = await em.find(RefundRequest, { booking: booking.id, status: "paid" }, { filters: { softDelete: false } });
      const totalDue = Number(booking.frozenPrice) * booking.pilgrimCount / Math.max(1, booking.pilgrims.length)
        + cancellations.reduce((sum, c) => sum + Number(c.chargeAmount), 0)
        + refunds.reduce((sum, r) => sum + Number(r.amount), 0);
      const remainingBalance = Math.max(0, totalDue - Number(booking.amountReceived)).toFixed(2);

      const receipt = {
        type: "installment" as const,
        receiptNumber: `INST-${payment.id.toUpperCase()}`,
        bookingId: booking.id,
        tranId,
        paymentId: payment.id,
        createdAt: new Date().toISOString(),
        cashierName: actor.fullName || actor.email || "Counter Cashier",
        cashierId: actor.id,
        pilgrimName: booking.pilgrims.getItems()[0]?.fullName || "Valued Pilgrim",
        pilgrimsCount: booking.pilgrimCount,
        packageName: booking.tier?.package?.name ? `${booking.tier.package.name} (${booking.tier.name})` : (booking.tier?.name || "Hajj / Umrah"),
        amountPaid: body.amount,
        amountTendered: tendered,
        changeDue,
        previousReceived,
        totalReceived: booking.amountReceived,
        totalPrice: booking.frozenPrice,
        remainingBalance,
        bookingStatus: booking.status,
        approvalStatus: "pending",
        paymentMethod,
        installments: updatedInstallments,
      };

      payment.receipt = receipt;
      await em.flush();
      return successResponse({ ok: true, booking, manualPayment: payment, receipt });
    });
  }

  @Get("installments") @RequireFeature("pos", "view")
  async recentInstallments(@Query() query: ListQueryDto, @CurrentUser() actor: User): Promise<any> {
    const scope = await this.rbac.getBranchScopeIds(actor);
    const page = await paginate(this.em, ManualPayment, { requestKey: { $ne: null }, ...(scope ? { branch: { $in: scope } } : {}) }, {
      cursor: query.cursor, pageSize: query.page_size, populate: ["booking"],
    });
    return listSuccessResponse(page.items.map(row => ({ ...row, gatewaySlug: row.method, tranId: row.receipt?.tranId, receipt: { ...row.receipt, approvalStatus: row.status } })), page.pagination);
  }
}
