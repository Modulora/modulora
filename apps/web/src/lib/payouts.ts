/**
 * Creator payout onboarding via Stripe Connect (Express accounts).
 *
 * A creator connects an Express account; Stripe handles their KYC, bank, and
 * tax onboarding, and pays them out. We only store the account id and whether
 * payouts are enabled. Marketplace sales transfer the creator's share to this
 * account at charge time (destination charges).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { getStripe } from "./stripe";

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

function originOf(): string {
  try {
    return new URL(getRequest()!.url).origin;
  } catch {
    return "https://modulora.dev";
  }
}

export interface PayoutStatus {
  configured: boolean; // Stripe keys present
  connected: boolean; // has a Connect account
  payoutsEnabled: boolean; // onboarding complete, can receive money
}

/** Whether an Express account can accept transfers/payouts. */
async function computeEnabled(stripeAccountId: string): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe) return false;
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return Boolean(account.payouts_enabled && account.details_submitted);
}

export const getPayoutStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<PayoutStatus> => {
    const stripe = getStripe();
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!stripe || !user) return { configured: Boolean(stripe), connected: false, payoutsEnabled: false };
    return { configured: true, connected: Boolean(user.stripeAccountId), payoutsEnabled: user.payoutsEnabled };
  },
);

/**
 * Create the Express account if needed and return a Stripe onboarding link.
 * The client redirects the creator to Stripe, who returns to /dashboard/payouts.
 */
export const startPayoutOnboarding = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; url?: string; error?: string }> => {
    const stripe = getStripe();
    if (!stripe) return { ok: false, error: "Payments are not configured." };
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false, error: "Sign in first." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    let accountId = user.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        metadata: { userId: user.id, username: user.username ?? "" },
        capabilities: { transfers: { requested: true } },
      });
      accountId = account.id;
      await db
        .update(schema.users)
        .set({ stripeAccountId: accountId, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id));
    }

    const origin = originOf();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/payouts?payouts=refresh`,
      return_url: `${origin}/dashboard/payouts?payouts=done`,
      type: "account_onboarding",
    });
    return { ok: true, url: link.url };
  },
);

/** Re-check the account with Stripe and persist payouts_enabled. */
export const refreshPayoutStatus = createServerFn({ method: "POST" }).handler(
  async (): Promise<PayoutStatus> => {
    const stripe = getStripe();
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!stripe || !user || !db) return { configured: Boolean(stripe), connected: false, payoutsEnabled: false };
    if (!user.stripeAccountId) return { configured: true, connected: false, payoutsEnabled: false };

    const enabled = await computeEnabled(user.stripeAccountId);
    if (enabled !== user.payoutsEnabled) {
      await db
        .update(schema.users)
        .set({ payoutsEnabled: enabled, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id));
      if (enabled && !user.payoutsEnabled) {
        const { emailPayoutsActive } = await import("./email");
        await emailPayoutsActive(user.email);
      }
    }
    return { configured: true, connected: true, payoutsEnabled: enabled };
  },
);

/** Express dashboard login link (for connected creators to manage payouts). */
export const getPayoutDashboardLink = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; url?: string; error?: string }> => {
    const stripe = getStripe();
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!stripe || !user?.stripeAccountId) return { ok: false, error: "No payout account." };
    const link = await stripe.accounts.createLoginLink(user.stripeAccountId);
    return { ok: true, url: link.url };
  },
);
