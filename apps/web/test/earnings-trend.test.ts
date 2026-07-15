import { describe, expect, it } from "vitest";

import { buildEarningsTrend } from "../src/lib/earnings-trend";

const date = (value: string) => new Date(`${value}T12:00:00.000Z`);

describe("buildEarningsTrend", () => {
  it("buckets verified installs, net sales, and payout activity by UTC day", () => {
    const trend = buildEarningsTrend({
      start: date("2026-07-01"),
      days: 3,
      installs: [{ createdAt: date("2026-07-01") }, { createdAt: date("2026-07-01") }, { createdAt: date("2026-07-03") }],
      shares: [{ createdAt: date("2026-07-02"), accruedAmount: 2500, paidAmount: 500 }],
      sales: [{ createdAt: date("2026-07-03"), amount: 2900, feeAmount: 290 }],
    });

    expect(trend).toEqual([
      { date: "2026-07-01", verifiedInstalls: 2, netSales: 0, profitShareAccrued: 0, profitSharePaid: 0 },
      { date: "2026-07-02", verifiedInstalls: 0, netSales: 0, profitShareAccrued: 2500, profitSharePaid: 500 },
      { date: "2026-07-03", verifiedInstalls: 1, netSales: 2610, profitShareAccrued: 0, profitSharePaid: 0 },
    ]);
  });

  it("returns continuous zero-filled days and ignores events outside the range", () => {
    const trend = buildEarningsTrend({
      start: date("2026-07-10"),
      days: 2,
      installs: [{ createdAt: date("2026-07-09") }],
      shares: [],
      sales: [],
    });

    expect(trend).toHaveLength(2);
    expect(trend.every((point) => point.verifiedInstalls === 0)).toBe(true);
  });
});
