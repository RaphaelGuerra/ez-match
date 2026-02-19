import type { ExceptionRecord, MatchRecord, WeekBundle } from "@/lib/types";

function summarizeDiscounts(exceptions: ExceptionRecord[]) {
  const discounts = exceptions.filter((exception) => exception.type === "discount");
  const total = discounts.reduce((sum, item) => sum + (item.discountAmount ?? 0), 0);

  const reasons = discounts.reduce<Record<string, number>>((acc, item) => {
    const key = item.reason || "Sem motivo";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topReasons = Object.entries(reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  return { rows: discounts, total, topReasons };
}

function summarizeActions(matches: MatchRecord[]) {
  return matches.filter((match) => match.status === "red" || match.status === "blue");
}

export function buildWeeklyReport(bundle: WeekBundle) {
  const expectedTotal = bundle.entries.reduce((sum, item) => sum + item.amount, 0);
  const receivedTotal = bundle.bankRecords.reduce((sum, item) => sum + item.amount, 0);

  const byStatus = bundle.matches.reduce<Record<MatchRecord["status"], number>>(
    (acc, match) => {
      acc[match.status] += 1;
      return acc;
    },
    { green: 0, yellow: 0, orange: 0, red: 0, blue: 0 },
  );

  return {
    summary: {
      expectedTotal,
      receivedTotal,
      diffTotal: receivedTotal - expectedTotal,
      byStatus,
    },
    discounts: summarizeDiscounts(bundle.exceptions),
    actions: summarizeActions(bundle.matches),
    matches: bundle.matches,
  };
}
