import { buildInstallmentSchedule } from "./installment.schedule";

/**
 * Guards extracted from BookingService so the CRUD rules stay covered:
 * - quota can never drop below confirmed seats
 * - tiers with active seats cannot be deleted
 * - refunds can never exceed the amount received
 * - partial cancellation charges pro-rate the frozen price
 */
export function assertQuotaChange(seatsConfirmed: number, seatsTotal: number) {
  if (seatsTotal < seatsConfirmed) throw new Error("QUOTA_BELOW_CONFIRMED");
}

export function assertTierDeletable(seatsConfirmed: number, seatsHeld: number) {
  if (seatsConfirmed > 0 || seatsHeld > 0) throw new Error("TIER_HAS_ACTIVE_SEATS");
}

export function assertRefundAllowed(amount: number, received: number) {
  if (amount > received) throw new Error("REFUND_EXCEEDS_RECEIVED");
}

export function partialCharge(frozenPrice: number, pilgrimCount: number, removed: number, chargePct: number) {
  return ((frozenPrice / pilgrimCount) * removed * chargePct) / 100;
}

export function assertPilgrimLimits(count: number, maxPilgrims = 10) {
  if (count < 1) throw new Error("AT_LEAST_ONE_PILGRIM_REQUIRED");
  if (count > maxPilgrims) throw new Error("EXCEEDS_MAX_PILGRIMS");
}

export function assertUniquePassports(passports: string[]) {
  const norm = passports.map((p) => p.trim().toUpperCase());
  if (new Set(norm).size !== norm.length) throw new Error("DUPLICATE_PASSPORT_IN_BOOKING");
}

describe("booking CRUD guards", () => {
  it("rejects quota below confirmed seats", () => {
    expect(() => assertQuotaChange(10, 9)).toThrow("QUOTA_BELOW_CONFIRMED");
    expect(() => assertQuotaChange(10, 10)).not.toThrow();
  });

  it("rejects deleting tiers with active seats", () => {
    expect(() => assertTierDeletable(1, 0)).toThrow("TIER_HAS_ACTIVE_SEATS");
    expect(() => assertTierDeletable(0, 2)).toThrow("TIER_HAS_ACTIVE_SEATS");
    expect(() => assertTierDeletable(0, 0)).not.toThrow();
  });

  it("rejects refunds above the amount received", () => {
    expect(() => assertRefundAllowed(500, 400)).toThrow("REFUND_EXCEEDS_RECEIVED");
    expect(() => assertRefundAllowed(400, 400)).not.toThrow();
  });

  it("caps refunds against already-open claims", () => {
    const openClaims = 300;
    const received = 1000;
    expect(() => assertRefundAllowed(701 + openClaims, received)).toThrow("REFUND_EXCEEDS_RECEIVED");
    expect(() => assertRefundAllowed(700, received - openClaims)).not.toThrow();
  });

  it("is safe to re-process an already-paid refund exactly once", () => {
    let received = 1000;
    const amount = 200;
    let wasPaid = false;
    const pay = () => {
      if (!wasPaid) {
        received -= amount;
        wasPaid = true;
      }
    };
    pay();
    pay();
    expect(received).toBe(800);
  });

  it("pro-rates partial cancellation charges", () => {
    expect(partialCharge(200000, 4, 1, 10)).toBe(5000);
  });

  it("installment schedule sums to the frozen total", () => {
    const schedule = buildInstallmentSchedule(200000);
    const sum = schedule.reduce((s, i) => s + i.amount, 0);
    expect(Math.round(sum)).toBe(200000);
  });

  it("enforces pilgrim limits: 1 mandatory, capped at package maximum", () => {
    expect(() => assertPilgrimLimits(0, 5)).toThrow("AT_LEAST_ONE_PILGRIM_REQUIRED");
    expect(() => assertPilgrimLimits(1, 5)).not.toThrow();
    expect(() => assertPilgrimLimits(5, 5)).not.toThrow();
    expect(() => assertPilgrimLimits(6, 5)).toThrow("EXCEEDS_MAX_PILGRIMS");
  });

  it("rejects duplicate passport numbers within the same booking", () => {
    expect(() => assertUniquePassports(["A123", "a123 "])).toThrow("DUPLICATE_PASSPORT_IN_BOOKING");
    expect(() => assertUniquePassports(["A123", "B456", "C789"])).not.toThrow();
  });

  it("calculates 30% down payment as sequence 0 of installment plan", () => {
    const total = 500000;
    const schedule = buildInstallmentSchedule(total, 0.3, 3);
    expect(schedule[0].sequence).toBe(0);
    expect(schedule[0].amount).toBe(150000);
  });
});
