/**
 * Profit-share distribution: periodically split the creator pool (30% of
 * distributable profit) by verified CLI installs, and transfer via Stripe
 * once a creator's accrued balance clears the threshold.
 *
 * Honest by construction: a run records exactly what happened — who accrued
 * what from which install counts, what was carried, what was paid, and the
 * Stripe transfer id. Below-threshold balances carry forward; nothing is
 * forfeited. Runs are owner-gated (OWNER_USER_IDS), never curator-gated:
 * curators review content; owners move money.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, gte, lt, sql as dsql } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { isOwnerUser } from "./access";
import { getStripe } from "./stripe";
import { PAYOUT_THRESHOLD_CENTS, SPLIT } from "./profit-share";

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

export interface RunResult {
  ok: boolean;
  error?: string;
  runId?: string;
  totals?: { creators: number; installs: number; pool: number; paid: number; carried: number };
}

export const createPayoutRun = createServerFn({ method: "POST" })
  .validator((data: { periodStart: string; periodEnd: string; distributableAmount: number }) => ({
    periodStart: new Date(String(data.periodStart)),
    periodEnd: new Date(String(data.periodEnd)),
    distributableAmount: Math.round(Number(data.distributableAmount)),
  }))
  .handler(async ({ data }): Promise<RunResult> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user || !isOwnerUser(user.id)) return { ok: false, error: "Not authorized." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };
    if (Number.isNaN(data.periodStart.getTime()) || Number.isNaN(data.periodEnd.getTime()) || data.periodEnd <= data.periodStart) {
      return { ok: false, error: "Invalid period." };
    }
    if (!Number.isFinite(data.distributableAmount) || data.distributableAmount <= 0) {
      return { ok: false, error: "Distributable amount must be positive (cents)." };
    }

    // 1. Verified installs per creator within the period.
    const rows = await db
      .select({
        userId: schema.namespaces.ownerUserId,
        installs: dsql<number>`count(*)::int`,
      })
      .from(schema.installReceipts)
      .innerJoin(schema.components, eq(schema.components.id, schema.installReceipts.componentId))
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(
        and(
          eq(schema.installReceipts.verified, true),
          gte(schema.installReceipts.createdAt, data.periodStart),
          lt(schema.installReceipts.createdAt, data.periodEnd),
        ),
      )
      .groupBy(schema.namespaces.ownerUserId);

    const creators = rows.filter((r): r is { userId: string; installs: number } => Boolean(r.userId));
    const totalInstalls = creators.reduce((sum, r) => sum + r.installs, 0);
    if (totalInstalls === 0) return { ok: false, error: "No verified installs in this period." };

    const pool = Math.floor((data.distributableAmount * SPLIT.creator) / 100);

    // 2. Record the run.
    const [run] = await db
      .insert(schema.payoutRuns)
      .values({
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        distributableAmount: data.distributableAmount,
        creatorPoolAmount: pool,
        totalVerifiedInstalls: totalInstalls,
        createdBy: user.id,
      })
      .returning({ id: schema.payoutRuns.id });

    const stripe = getStripe();
    let totalPaid = 0;
    let totalCarried = 0;

    for (const creator of creators) {
      const accrued = Math.floor((pool * creator.installs) / totalInstalls);

      // Carried balance = everything accrued before minus everything paid before.
      const [prev] = await db
        .select({
          accrued: dsql<number>`coalesce(sum(${schema.payoutRunShares.accruedAmount}), 0)::int`,
          paid: dsql<number>`coalesce(sum(${schema.payoutRunShares.paidAmount}), 0)::int`,
        })
        .from(schema.payoutRunShares)
        .where(eq(schema.payoutRunShares.userId, creator.userId));
      const carried = (prev?.accrued ?? 0) - (prev?.paid ?? 0);
      const payable = accrued + carried;

      const [account] = await db
        .select({ stripeAccountId: schema.users.stripeAccountId, payoutsEnabled: schema.users.payoutsEnabled })
        .from(schema.users)
        .where(eq(schema.users.id, creator.userId))
        .limit(1);

      let status: "paid" | "carried" | "failed" = "carried";
      let paidAmount = 0;
      let transferId: string | null = null;

      if (payable >= PAYOUT_THRESHOLD_CENTS && account?.stripeAccountId && account.payoutsEnabled && stripe) {
        try {
          const transfer = await stripe.transfers.create({
            amount: payable,
            currency: "usd",
            destination: account.stripeAccountId,
            description: `Modulora profit share (run ${run!.id})`,
            metadata: { type: "profit-share", runId: run!.id, userId: creator.userId },
          });
          status = "paid";
          paidAmount = payable;
          transferId = transfer.id;
        } catch (error) {
          // Transfer failed (e.g. insufficient platform balance): keep the
          // balance carried — the ledger stays truthful and retries next run.
          console.error("profit-share transfer failed", creator.userId, error);
          status = "failed";
        }
      }

      await db.insert(schema.payoutRunShares).values({
        runId: run!.id,
        userId: creator.userId,
        verifiedInstalls: creator.installs,
        accruedAmount: accrued,
        carriedAmount: carried,
        paidAmount,
        stripeTransferId: transferId,
        status,
      });

      totalPaid += paidAmount;
      totalCarried += status === "paid" ? 0 : payable;
    }

    return {
      ok: true,
      runId: run!.id,
      totals: { creators: creators.length, installs: totalInstalls, pool, paid: totalPaid, carried: totalCarried },
    };
  });

export interface PayoutRunSummary {
  id: string;
  periodStart: string;
  periodEnd: string;
  distributableAmount: number;
  creatorPoolAmount: number;
  totalVerifiedInstalls: number;
  creators: number;
  paid: number;
  createdAt: string;
}

export const listPayoutRuns = createServerFn({ method: "GET" }).handler(
  async (): Promise<PayoutRunSummary[]> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user || !isOwnerUser(user.id)) return [];
    const db = getDb();
    if (!db) return [];
    const runs = await db.select().from(schema.payoutRuns).orderBy(desc(schema.payoutRuns.createdAt)).limit(20);
    const out: PayoutRunSummary[] = [];
    for (const run of runs) {
      const [agg] = await db
        .select({
          creators: dsql<number>`count(*)::int`,
          paid: dsql<number>`coalesce(sum(${schema.payoutRunShares.paidAmount}), 0)::int`,
        })
        .from(schema.payoutRunShares)
        .where(eq(schema.payoutRunShares.runId, run.id));
      out.push({
        id: run.id,
        periodStart: run.periodStart.toISOString(),
        periodEnd: run.periodEnd.toISOString(),
        distributableAmount: run.distributableAmount,
        creatorPoolAmount: run.creatorPoolAmount,
        totalVerifiedInstalls: run.totalVerifiedInstalls,
        creators: agg?.creators ?? 0,
        paid: agg?.paid ?? 0,
        createdAt: run.createdAt.toISOString(),
      });
    }
    return out;
  },
);
