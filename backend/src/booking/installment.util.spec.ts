import { buildInstallmentSchedule } from "./installment.schedule";

describe("buildInstallmentSchedule", () => {
  it("splits total into down payment plus remaining installments", () => {
    const schedule = buildInstallmentSchedule(1000, 0.3, 2);
    const sum = schedule.reduce((s, i) => s + i.amount, 0);
    expect(schedule[0].amount).toBe(300);
    expect(Math.round(sum)).toBe(1000);
    expect(schedule).toHaveLength(3);
  });
});
