/**
 * Creator earnings: what you've sold, what you've earned. Reads the purchases
 * ledger for components the signed-in user sold. Marketplace sales only —
 * profit-share distributions land here once the payout ledger exists (#32).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, gte, sql as dsql } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { buildEarningsTrend, type EarningsTrendPoint } from "./earnings-trend";

export type { EarningsTrendPoint } from "./earnings-trend";

export interface EarningsSale {
  id: string;
  componentTitle: string;
  componentName: string;
  buyerUsername: string | null;
  amount: number;
  feeAmount: number;
  currency: string;
  createdAt: string;
}

export interface EarningsData {
  payoutsEnabled: boolean;
  totalSales: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  sales: EarningsSale[];
  /** Verified CLI installs of this creator's components (profit-share signal). */
  verifiedInstalls: number;
  /**
   * Profit share distributed to this creator to date, in cents — the sum of
   * paid ledger rows. Never estimated.
   */
  profitShareDistributed: number;
  /** Accrued but not yet paid (below threshold / awaiting a run), in cents. */
  profitSharePending: number;
  /** Honest daily activity for the trailing 30 UTC days. Money is in cents. */
  trend: EarningsTrendPoint[];
}

export const fetchEarnings = createServerFn({ method: "GET" }).handler(
  async (): Promise<EarningsData | null> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const databaseUrl = process.env.DATABASE_URL;
    if (!user || !databaseUrl) return null;
    const db = drizzle(neon(databaseUrl), { schema });

    const rows = await db
      .select({
        id: schema.purchases.id,
        amount: schema.purchases.amount,
        feeAmount: schema.purchases.feeAmount,
        currency: schema.purchases.currency,
        createdAt: schema.purchases.createdAt,
        componentTitle: schema.components.title,
        componentName: schema.components.name,
        buyerUsername: schema.users.username,
      })
      .from(schema.purchases)
      .innerJoin(schema.components, eq(schema.components.id, schema.purchases.componentId))
      .leftJoin(schema.users, eq(schema.users.id, schema.purchases.buyerUserId))
      .where(and(eq(schema.purchases.sellerUserId, user.id), eq(schema.purchases.status, "paid")))
      .orderBy(desc(schema.purchases.createdAt))
      .limit(100);

    const gross = rows.reduce((sum, r) => sum + r.amount, 0);
    const fees = rows.reduce((sum, r) => sum + r.feeAmount, 0);

    const trendStart = new Date();
    trendStart.setUTCHours(0, 0, 0, 0);
    trendStart.setUTCDate(trendStart.getUTCDate() - 29);

    // Verified installs across the creator's components, plus bounded events
    // for the interactive trailing-30-day chart.
    const [installs, installEvents, shareEvents, saleEvents] = await Promise.all([
      db
        .select({ id: schema.installReceipts.id })
        .from(schema.installReceipts)
        .innerJoin(schema.components, eq(schema.components.id, schema.installReceipts.componentId))
        .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
        .where(and(eq(schema.namespaces.ownerUserId, user.id), eq(schema.installReceipts.verified, true))),
      db
        .select({ createdAt: schema.installReceipts.createdAt })
        .from(schema.installReceipts)
        .innerJoin(schema.components, eq(schema.components.id, schema.installReceipts.componentId))
        .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
        .where(and(eq(schema.namespaces.ownerUserId, user.id), eq(schema.installReceipts.verified, true), gte(schema.installReceipts.createdAt, trendStart))),
      db
        .select({ createdAt: schema.payoutRunShares.createdAt, accruedAmount: schema.payoutRunShares.accruedAmount, paidAmount: schema.payoutRunShares.paidAmount })
        .from(schema.payoutRunShares)
        .where(and(eq(schema.payoutRunShares.userId, user.id), gte(schema.payoutRunShares.createdAt, trendStart))),
      db
        .select({ createdAt: schema.purchases.createdAt, amount: schema.purchases.amount, feeAmount: schema.purchases.feeAmount })
        .from(schema.purchases)
        .where(and(eq(schema.purchases.sellerUserId, user.id), eq(schema.purchases.status, "paid"), gte(schema.purchases.createdAt, trendStart))),
    ]);

    // Profit-share ledger: distributed = sum(paid); pending = accrued − paid.
    const [ledger] = await db
      .select({
        accrued: dsql<number>`coalesce(sum(${schema.payoutRunShares.accruedAmount}), 0)::int`,
        paid: dsql<number>`coalesce(sum(${schema.payoutRunShares.paidAmount}), 0)::int`,
      })
      .from(schema.payoutRunShares)
      .where(eq(schema.payoutRunShares.userId, user.id));

    const trend = buildEarningsTrend({ start: trendStart, installs: installEvents, shares: shareEvents, sales: saleEvents });

    return {
      payoutsEnabled: user.payoutsEnabled ?? false,
      totalSales: rows.length,
      grossAmount: gross,
      feeAmount: fees,
      netAmount: gross - fees,
      verifiedInstalls: installs.length,
      profitShareDistributed: ledger?.paid ?? 0,
      profitSharePending: Math.max(0, (ledger?.accrued ?? 0) - (ledger?.paid ?? 0)),
      trend,
      sales: rows.map((r) => ({
        id: r.id,
        componentTitle: r.componentTitle,
        componentName: r.componentName,
        buyerUsername: r.buyerUsername,
        amount: r.amount,
        feeAmount: r.feeAmount,
        currency: r.currency,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  },
);
