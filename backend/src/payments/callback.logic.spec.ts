describe("payment attempt state machine", () => {
  const terminal = new Set(["success", "failed", "cancelled"]);
  function next(current: string, incoming: string) {
    if (terminal.has(current)) return current;
    return incoming;
  }

  it("is idempotent once terminal", () => {
    expect(next("success", "failed")).toBe("success");
    expect(next("pending", "success")).toBe("success");
  });

  it("accepts amount within 1.00 tolerance", () => {
    const ok = (stored: number, validated: number) => Math.abs(validated - stored) <= 1;
    expect(ok(100, 100.4)).toBe(true);
    expect(ok(100, 102)).toBe(false);
  });
});
