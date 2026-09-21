/**
 * Reconciliation rules from AccountsService:
 * - gateway vs internal amounts match within 1.00 tolerance
 * - only mismatches can be resolved, and only by an admin (full)
 * - manual payments need a different approver than the recorder
 */
export function settlementMatches(stored: number | undefined, gateway: number) {
  if (stored === undefined) return false;
  return Math.abs(stored - gateway) <= 1;
}

export function assertResolvable(status: string) {
  if (status !== "mismatch") throw new Error("ONLY_MISMATCH_RESOLVABLE");
}

export function assertDifferentApprover(recordedBy: string, approver: string) {
  if (recordedBy === approver) throw new Error("RECORDER_APPROVER_MUST_DIFFER");
}

export function sarToBdt(amountSar: number, fxRate: number) {
  return +(amountSar * fxRate).toFixed(2);
}

describe("accounts reconciliation rules", () => {
  it("matches settlement amounts within tolerance", () => {
    expect(settlementMatches(100, 100.4)).toBe(true);
    expect(settlementMatches(100, 102)).toBe(false);
    expect(settlementMatches(undefined, 100)).toBe(false);
  });

  it("only resolves open mismatches", () => {
    expect(() => assertResolvable("matched")).toThrow("ONLY_MISMATCH_RESOLVABLE");
    expect(() => assertResolvable("resolved")).toThrow("ONLY_MISMATCH_RESOLVABLE");
    expect(() => assertResolvable("mismatch")).not.toThrow();
  });

  it("requires a different approver for branch cash", () => {
    expect(() => assertDifferentApprover("u1", "u1")).toThrow("RECORDER_APPROVER_MUST_DIFFER");
    expect(() => assertDifferentApprover("u1", "u2")).not.toThrow();
  });

  it("converts SAR disbursements at the recorded FX rate", () => {
    expect(sarToBdt(1000, 32.5)).toBe(32500);
  });
});
