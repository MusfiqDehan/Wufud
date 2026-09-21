export function buildInstallmentSchedule(total: number, downPercent = 0.3, count = 3, firstDue = new Date(), departure?: Date) {
  if (!Number.isFinite(total) || total <= 0 || !Number.isInteger(count) || count < 1 || downPercent <= 0 || downPercent >= 1) throw new Error("Invalid installment plan");
  const lastDue = departure ? new Date(departure).getTime() - 86400000 : undefined;
  if (lastDue !== undefined && (!Number.isFinite(lastDue) || lastDue <= firstDue.getTime())) throw new Error("Installments require at least one day before departure");
  const down = +(total * downPercent).toFixed(2);
  const rest = +(total - down).toFixed(2);
  const each = +(rest / count).toFixed(2);
  const items: { sequence: number; dueDate: Date; amount: number }[] = [
    { sequence: 0, dueDate: firstDue, amount: down },
  ];
  for (let i = 1; i <= count; i++) {
    const due = new Date(firstDue);
    if (lastDue === undefined) due.setMonth(due.getMonth() + i);
    else due.setTime(firstDue.getTime() + Math.floor((lastDue - firstDue.getTime()) * i / count));
    const amount = i === count ? +(rest - each * (count - 1)).toFixed(2) : each;
    items.push({ sequence: i, dueDate: due, amount });
  }
  return items;
}
