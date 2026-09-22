import { Cancellation, CancellationRule, RefundRequest } from "./entities/cancellation.entity";
import { Vendor, VendorDisbursement } from "../accounts/entities/vendor.entity";
import { PaymentsService } from "../payments/payments.service";
import { PaymentAttempt } from "../payments/entities/payment-attempt.entity";
import { ManualPayment, Payment } from "../accounts/entities/payment.entity";
import { tenantAls } from "../tenancy/tenant-context";
import * as gateways from "../payments/adapters/factory";
import { MikroORM } from "@mikro-orm/postgresql";
import { ALL_ENTITIES } from "../database/entities";
import { TENANT_DDL } from "../tenancy/tenant-ddl";
import { BookingService } from "./booking.service";
import { AccountsService } from "../accounts/accounts.service";
import { PosController } from "../accounts/pos.controller";
import { TravelPackage, PackageTier } from "./entities/package.entity";
import { Booking, SeatHold } from "./entities/booking.entity";
import { StockIssue, StockItem } from "../accounts/entities/stock.entity";
import { Installment } from "./entities/installment.entity";
import { User } from "../identity/entities/user.entity";
import { randomUUID } from "node:crypto";

const describeDb = process.env.BUSINESS_TEST_DATABASE_URL ? describe : describe.skip;
describeDb("business rules against PostgreSQL", () => {
  let orm: MikroORM;
  const schema = `test_rules_${Date.now()}`;
  const actor = { id: randomUUID() } as User;
  const approver = { id: randomUUID() } as User;
  const rbac = { assertBranchAccess: async () => {}, getBranchScopeIds: async () => null } as any;
  const mail = { send: async () => ({ sent: false }) } as any;
  const em = () => orm.em.fork({ schema });
  const bookingService = () => new BookingService(em(), rbac, mail);
  const accountsService = () => new AccountsService(em(), rbac);
  async function tier(seats = 2) {
    const db = em();
    const pkg = db.create(TravelPackage, { name: "Test", kind: "hajj", departureDate: new Date(Date.now() + 90 * 86400000), bookingOpensAt: new Date(Date.now() - 86400000), bookingClosesAt: new Date(Date.now() + 86400000), isPublished: true });
    const t = db.create(PackageTier, { package: pkg, name: "Economy", price: "1000.00", seatsTotal: seats });
    await db.flush(); return t;
  }
  const input = (id: string, mode: "full" | "installment" = "full", count = 1) => ({ tierId: id, paymentMode: mode, pilgrims: Array.from({ length: count }, (_, i) => ({ fullName: `Pilgrim ${i}`, passportNumber: `P${i}` })) });
  beforeAll(async () => {
    jest.spyOn(gateways, "getGateway").mockReturnValue({ validate: async () => ({ status: "VALID", amount: 1000, currency: "BDT", raw: {} }) } as any);
    orm = await MikroORM.init({ clientUrl: process.env.BUSINESS_TEST_DATABASE_URL, entities: ALL_ENTITIES, schema, allowGlobalContext: true });
    await orm.em.getConnection().execute(`create schema "${schema}"`);
    await orm.em.getConnection().execute(TENANT_DDL.replaceAll("__SCHEMA__", schema));
  });
  afterAll(async () => { if (orm) { await orm.em.getConnection().execute(`drop schema "${schema}" cascade`); await orm.close(); } });

  it("rejects cross-branch manual rejection without changing payment status", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id));
    const p = await accountsService().recordManual(actor, { bookingId: b.id, amount: "100" });
    const restricted = { ...rbac, assertBranchAccess: async () => { throw new Error("Branch denied"); } };
    await expect(new AccountsService(em(), restricted).rejectManual(p.id, approver)).rejects.toThrow("Branch denied");
    expect((await em().findOneOrFail(ManualPayment, p.id)).status).toBe("pending");
  });
  it("aggregates multiple charges and refunds without multiplying joins", async () => {
    const before = await accountsService().report();
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id));
    const db = em();
    db.create(Cancellation, { booking: b.id, chargeAmount: "10" });
    db.create(Cancellation, { booking: b.id, chargeAmount: "20", isDeleted: true });
    db.create(RefundRequest, { booking: b.id, amount: "5", status: "paid" });
    db.create(RefundRequest, { booking: b.id, amount: "7", status: "paid", isDeleted: true });
    db.create(RefundRequest, { booking: b.id, amount: "99", status: "requested" });
    await db.flush();
    const after = await accountsService().report();
    expect(Number(after.outstanding) - Number(before.outstanding)).toBe(1042);
    expect(Number(after.refunds) - Number(before.refunds)).toBe(12);
    expect(after.bookings - before.bookings).toBe(1);
    const otherSchema = `empty_${schema}`;
    await db.getConnection().execute(`create schema "${otherSchema}"`);
    try {
      await db.getConnection().execute(TENANT_DDL.replaceAll("__SCHEMA__", otherSchema));
      const empty = await new AccountsService(orm.em.fork({ schema: otherSchema }), rbac).report();
      expect(empty.collected).toBe("0.00"); expect(empty.outstanding).toBe("0.00"); expect(empty.bookings).toBe(0);
    } finally { await db.getConnection().execute(`drop schema "${otherSchema}" cascade`); }
  });
  it("allows exactly one of two simultaneous last-seat bookings", async () => {
    const t = await tier(1);
    const results = await Promise.allSettled([bookingService().createBooking(actor, input(t.id)), bookingService().createBooking(actor, input(t.id))]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((await em().findOneOrFail(PackageTier, t.id)).seatsHeld).toBe(1);
  });
  it("rejects a booking outside its booking window", async () => {
    const t = await tier(); await em().nativeUpdate(TravelPackage, t.package.id, { bookingClosesAt: new Date(Date.now() - 1000) });
    await expect(bookingService().createBooking(actor, input(t.id))).rejects.toThrow("booking window");
  });
  it("confirms installments on down payment and closes the hold exactly once", async () => {
    const t = await tier(); const booking = await bookingService().createBooking(actor, input(t.id, "installment"));
    const manual = await accountsService().recordManual(actor, { bookingId: booking.id, amount: "300" });
    await expect(accountsService().approveManual(manual.id, actor)).rejects.toThrow("different users");
    const results = await Promise.allSettled([accountsService().approveManual(manual.id, approver), accountsService().approveManual(manual.id, approver)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const db = em(); const updated = await db.findOneOrFail(Booking, booking.id); const quota = await db.findOneOrFail(PackageTier, t.id);
    expect(updated.status).toBe("confirmed"); expect(updated.amountReceived).toBe("300.00"); expect(quota.seatsHeld).toBe(0); expect(quota.seatsConfirmed).toBe(1);
    expect(await db.count(SeatHold, { booking: booking.id, isOpen: true })).toBe(0);
    const installments = await db.find(Installment, { plan: { booking: booking.id } }, { orderBy: { sequence: "ASC" } });
    expect(installments[0].status).toBe("paid");
    expect(installments.at(-1)!.dueDate.getTime()).toBeLessThan(t.package.departureDate.getTime());
  });
  it("partial cancellation releases held seats and leaves remaining pilgrims booked", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id, "full", 2));
    const db = em(); const booking = await db.findOneOrFail(Booking, b.id, { populate: ["pilgrims"] });
    await bookingService().cancel(b.id, actor, [booking.pilgrims[0].id]);
    expect((await em().findOneOrFail(PackageTier, t.id)).seatsHeld).toBe(1);
    expect((await em().findOneOrFail(Booking, b.id)).pilgrimCount).toBe(1);
  });
  it("serializes refund claims and enforces the approval workflow without changing gross receipts", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id));
    const payment = await accountsService().recordManual(actor, { bookingId: b.id, amount: "1000" }); await accountsService().approveManual(payment.id, approver);
    const results = await Promise.allSettled([bookingService().requestRefund(b.id, "600", actor), bookingService().requestRefund(b.id, "600", actor)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const r = (results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<any>).value;
    await expect(bookingService().processRefund(r.id, "paid", approver)).rejects.toThrow("transition");
    for (const state of ["approved", "processing", "paid"] as const) await bookingService().processRefund(r.id, state, approver);
    await expect(bookingService().requestRefund(b.id, "401", actor)).rejects.toThrow();
    expect((await em().findOneOrFail(Booking, b.id)).amountReceived).toBe("1000.00");
  });
  it("serializes stock issues and rejects negative quantities", async () => {
    const db = em(); const item = db.create(StockItem, { name: "Bag", quantity: 1 }); await db.flush();
    const results = await Promise.allSettled([accountsService().issueStock({ itemId: item.id, quantity: 1 }), accountsService().issueStock({ itemId: item.id, quantity: 1 })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    await expect(accountsService().issueStock({ itemId: item.id, quantity: -1 })).rejects.toThrow();
  });
  it("credits duplicate success callbacks once, even after a failed redirect", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id));
    const db = em();
    const attempt = db.create(PaymentAttempt, { tranId: randomUUID(), gatewaySlug: "stripe", amount: "1000", currency: "BDT", sourceRef: b.id, status: "failed", valId: "session-test" });
    await db.flush();
    await tenantAls.run({ schema, host: "demo.wufud.localhost", plane: "tenant" }, async () => {
      await Promise.all([new PaymentsService(em(), {} as any).handleCallback({ tranId: attempt.tranId, valId: "session-test", status: "success" }), new PaymentsService(em(), {} as any).handleCallback({ tranId: attempt.tranId, valId: "session-test", status: "success" })]);
    });
    expect(await em().count(Payment, { tranId: attempt.tranId })).toBe(1);
    expect((await em().findOneOrFail(Booking, b.id)).amountReceived).toBe("1000.00");
  });
  it("expired holds release once and late money does not resurrect a booking", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id));
    await em().nativeUpdate(SeatHold, { booking: b.id }, { expiresAt: new Date(Date.now() - 1000) });
    await Promise.all([bookingService().releaseExpiredHolds(), bookingService().releaseExpiredHolds()]);
    const p = await accountsService().recordManual(actor, { bookingId: b.id, amount: "1000" });
    await accountsService().approveManual(p.id, approver);
    expect((await em().findOneOrFail(Booking, b.id)).status).toBe("cancelled");
    const quota = await em().findOneOrFail(PackageTier, t.id);
    expect(quota.seatsHeld).toBe(0); expect(quota.seatsConfirmed).toBe(0);
  });
  it("applies partial payments oldest-first and retains overpayments", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id, "installment"));
    for (const amount of ["100", "250"]) {
      const p = await accountsService().recordManual(actor, { bookingId: b.id, amount }); await accountsService().approveManual(p.id, approver);
    }
    let dues = await em().find(Installment, { plan: { booking: b.id } }, { orderBy: { sequence: "ASC" } });
    expect(dues[0].amountPaid).toBe("300.00"); expect(dues[1].amountPaid).toBe("50.00"); expect(dues[1].status).toBe("open");
    const p = await accountsService().recordManual(actor, { bookingId: b.id, amount: "1000" }); await accountsService().approveManual(p.id, approver);
    dues = await em().find(Installment, { plan: { booking: b.id } });
    expect(dues.every(i => i.status === "paid")).toBe(true);
    expect((await em().findOneOrFail(Booking, b.id)).amountReceived).toBe("1350.00");
  });
  it("selects the days-based cancellation rule and adds pro-rated vendor costs", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id, "installment", 2));
    const db = em();
    db.create(CancellationRule, { daysBeforeDeparture: 120, chargePercent: "5" });
    db.create(CancellationRule, { daysBeforeDeparture: 30, chargePercent: "20" });
    const vendor = db.create(Vendor, { name: "Hotel", kind: "hotel" });
    db.create(VendorDisbursement, { vendor, booking: b.id, amountSar: "10", fxRate: "30", amountBdt: "300" });
    await db.flush();
    const booking = await db.findOneOrFail(Booking, b.id, { populate: ["pilgrims"] });
    await bookingService().cancel(b.id, actor, [booking.pilgrims[0].id]);
    const cancellation = await em().findOneOrFail(Cancellation, { booking: b.id });
    expect(cancellation.chargeAmount).toBe("350.00");
    const dues = await em().find(Installment, { plan: { booking: b.id } });
    expect(dues.reduce((sum, i) => sum + Math.round(Number(i.amountDue) * 100), 0)).toBe(200000);
    expect(dues.reduce((sum, i) => sum + Math.round(Number(i.amountWaived) * 100), 0)).toBe(65000);
  });
  it("defaults confirmed bookings after grace without releasing confirmed seats", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id, "installment"));
    const p = await accountsService().recordManual(actor, { bookingId: b.id, amount: "300" }); await accountsService().approveManual(p.id, approver);
    await em().nativeUpdate(Installment, { plan: { booking: b.id }, sequence: 1 }, { dueDate: new Date(Date.now() - 10 * 86400000) });
    await bookingService().markOverdue(7);
    expect((await em().findOneOrFail(Booking, b.id)).status).toBe("defaulted");
    expect((await em().findOneOrFail(PackageTier, t.id)).seatsConfirmed).toBe(1);
  });
  it("keeps archived financial records in reporting and freezes the booked price", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id));
    const p = await accountsService().recordManual(actor, { bookingId: b.id, amount: "1000" }); await accountsService().approveManual(p.id, approver);
    await bookingService().updateTier(t.id, { price: "1500" });
    expect((await em().findOneOrFail(Booking, b.id)).frozenPrice).toBe("1000.00");
    const before = await accountsService().report();
    await bookingService().removeBooking(b.id, actor);
    const after = await accountsService().report();
    expect(after.collected).toBe(before.collected); expect(after.bookings).toBe(before.bookings);
  });
  it("POS collections remain pending, retry safely, and require another approver", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id, "installment"));
    const body = { requestKey: randomUUID(), bookingId: b.id, amount: "300", method: "cash" as const, tendered: 500 };
    const [first, retry] = await Promise.all([new PosController(em(), rbac).collectInstallment(body, actor), new PosController(em(), rbac).collectInstallment(body, actor)]);
    expect(first.data.manualPayment.id).toBe(retry.data.manualPayment.id);
    expect(first.data.receipt.approvalStatus).toBe("pending");
    expect((await em().findOneOrFail(Booking, b.id)).amountReceived).toBe("0.00");
    expect(await em().count(Payment, { booking: b.id })).toBe(0);
    await expect(accountsService().approveManual(first.data.manualPayment.id, actor)).rejects.toThrow("different users");
    await accountsService().approveManual(first.data.manualPayment.id, approver);
    expect((await em().findOneOrFail(Booking, b.id)).amountReceived).toBe("300.00");
    expect((await em().findOneOrFail(Booking, b.id)).status).toBe("confirmed");
    const history = await new PosController(em(), rbac).recentInstallments({ page_size: 100 } as any, actor);
    const row = history.data.items.find((p: any) => p.id === first.data.manualPayment.id);
    expect(row.receipt.changeDue).toBe("200.00");
    expect(row.receipt.approvalStatus).toBe("approved");
  });
  it("rejects under-tendered sales and collections without financial or stock changes", async () => {
    const db = em(); const item = db.create(StockItem, { name: "Bag", quantity: 1, salePrice: "100" }); await db.flush();
    await expect(new PosController(em(), rbac).checkout({ requestKey: randomUUID(), lines: [{ itemId: item.id, quantity: 1 }], amountTendered: 50 }, actor)).rejects.toThrow("tendered");
    expect((await em().findOneOrFail(StockItem, item.id)).quantity).toBe(1);
    expect(await em().count(StockIssue, { item: item.id })).toBe(0);
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id));
    await expect(new PosController(em(), rbac).collectInstallment({ requestKey: randomUUID(), bookingId: b.id, amount: "100", tendered: 50 }, actor)).rejects.toThrow("tendered");
    expect(await em().count(ManualPayment, { booking: b.id })).toBe(0);
  });
  it("keeps receipt details on retries and reverses costs without deleting history", async () => {
    const db = em(); const item = db.create(StockItem, { name: "Bag", quantity: 2, salePrice: "100", unitCost: "60" }); await db.flush();
    const body = { requestKey: randomUUID(), lines: [{ itemId: item.id, quantity: 1 }], paymentMethod: "Cash", amountTendered: 150, customerName: "Test customer" };
    const sale = (await new PosController(em(), rbac).checkout(body, actor)).data;
    const retry = (await new PosController(em(), rbac).checkout(body, actor)).data;
    expect(retry.receipt.customerName).toBe("Test customer"); expect(retry.receipt.changeDue).toBe("50.00");
    await Promise.all([new PosController(em(), rbac).refund(sale.id, actor), new PosController(em(), rbac).refund(sale.id, actor)]);
    const issues = await em().find(StockIssue, { item: item.id }, { filters: { softDelete: false } });
    expect(issues).toHaveLength(2); expect(issues.every(i => !i.isDeleted)).toBe(true);
    expect(issues.reduce((sum, i) => sum + Number(i.costBdt), 0)).toBe(0);
    expect(issues.reduce((sum, i) => sum + i.quantity, 0)).toBe(0);
    const refunded = (await new PosController(em(), rbac).refund(sale.id, actor)).data;
    expect(refunded.refundReceipt.amountRefunded).toBe("100.00");
  });
  it("blocks cross-branch POS collection and rejects invalid catalog edits", async () => {
    const t = await tier(); const b = await bookingService().createBooking(actor, input(t.id));
    const restricted = { ...rbac, assertBranchAccess: async () => { throw new Error("Branch denied"); } };
    await expect(new PosController(em(), restricted).collectInstallment({ requestKey: randomUUID(), bookingId: b.id, amount: "100" }, actor)).rejects.toThrow("Branch denied");
    expect(await em().count(ManualPayment, { booking: b.id })).toBe(0);
    const db = em(); const item = db.create(StockItem, { name: "Bag", quantity: 2, salePrice: "100" }); await db.flush();
    await expect(new PosController(em(), rbac).updateItem(item.id, { quantity: -1 }, actor)).rejects.toThrow("non-negative");
    await expect(new PosController(em(), rbac).updateItem(item.id, { kind: "service" }, actor)).rejects.toThrow("Archive");
  });
  it("POS retries create one sale and repeated refunds restore stock once", async () => {
    const db = em(); const item = db.create(StockItem, { name: "Bag", quantity: 2, salePrice: "100" }); await db.flush();
    const body = { requestKey: randomUUID(), lines: [{ itemId: item.id, quantity: 1 }] };
    const results = await Promise.all([new PosController(em(), rbac).checkout(body, actor), new PosController(em(), rbac).checkout(body, actor)]);
    expect(results[0].data?.id).toBe(results[1].data?.id);
    const sale = results[0].data!;
    await Promise.all([new PosController(em(), rbac).refund(sale.id, actor), new PosController(em(), rbac).refund(sale.id, actor)]);
    expect((await em().findOneOrFail(StockItem, item.id)).quantity).toBe(2);
  });
});
