export interface EarningsTrendPoint {
  date: string;
  verifiedInstalls: number;
  netSales: number;
  profitShareAccrued: number;
  profitSharePaid: number;
}

export function buildEarningsTrend({
  start,
  days = 30,
  installs,
  shares,
  sales,
}: {
  start: Date;
  days?: number;
  installs: { createdAt: Date }[];
  shares: { createdAt: Date; accruedAmount: number; paidAmount: number }[];
  sales: { createdAt: Date; amount: number; feeAmount: number }[];
}): EarningsTrendPoint[] {
  const byDate = new Map<string, EarningsTrendPoint>();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    byDate.set(key, { date: key, verifiedInstalls: 0, netSales: 0, profitShareAccrued: 0, profitSharePaid: 0 });
  }

  for (const event of installs) {
    const point = byDate.get(event.createdAt.toISOString().slice(0, 10));
    if (point) point.verifiedInstalls += 1;
  }
  for (const event of shares) {
    const point = byDate.get(event.createdAt.toISOString().slice(0, 10));
    if (point) {
      point.profitShareAccrued += event.accruedAmount;
      point.profitSharePaid += event.paidAmount;
    }
  }
  for (const event of sales) {
    const point = byDate.get(event.createdAt.toISOString().slice(0, 10));
    if (point) point.netSales += event.amount - event.feeAmount;
  }

  return [...byDate.values()];
}
