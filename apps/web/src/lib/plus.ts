/**
 * Modulora Plus — the subscription (#61). Stripe Billing with an inline
 * recurring price (no dashboard product setup); the entitlement is the
 * user.is_plus flag, set on checkout completion and cleared when the
 * subscription ends. Billing management goes through the Stripe portal.
 *
 * Honesty rule: Plus buys convenience for the subscriber (bookmarks, lists,
 * curation surfaces). It never buys rank, trust, review priority over
 * policy, or anything that would distort the catalog.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { getStripe } from "./stripe";
import { originOf } from "./marketplace";

export const PLUS_PRICE_CENTS = Number(process.env.PLUS_PRICE_CENTS ?? 800);

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

/** Reuse or create the user's Stripe customer (not the Connect account). */
async function customerFor(userId: string, email: string): Promise<string | null> {
  const stripe = getStripe();
  const db = getDb();
  if (!stripe || !db) return null;
  const [row] = await db.select({ id: schema.users.stripeCustomerId }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (row?.id) return row.id;
  const customer = await stripe.customers.create({ email, metadata: { userId } });
  await db.update(schema.users).set({ stripeCustomerId: customer.id, updatedAt: new Date() }).where(eq(schema.users.id, userId));
  return customer.id;
}

export const startPlusCheckout = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; url?: string; error?: string }> => {
    const stripe = getStripe();
    if (!stripe) return { ok: false, error: "Payments are not configured." };
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false, error: "Sign in first." };
    if (user.isPlus) return { ok: false, error: "You're already on Plus." };

    const customer = await customerFor(user.id, user.email);
    if (!customer) return { ok: false, error: "Could not set up billing." };

    const origin = originOf();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      success_url: `${origin}/pricing?subscribed={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PLUS_PRICE_CENTS,
            recurring: { interval: "month" },
            product_data: { name: "Modulora Plus" },
          },
        },
      ],
      metadata: { type: "plus", userId: user.id },
      subscription_data: { metadata: { type: "plus", userId: user.id } },
    });
    return { ok: true, url: session.url ?? undefined };
  },
);

/** Fulfil a Plus checkout (webhook + return-URL confirm both land here). */
export async function fulfilPlusCheckout(userId: string, subscriptionId: string | null): Promise<void> {
  const db = getDb();
  if (!db || !userId) return;
  await db
    .update(schema.users)
    .set({ isPlus: true, plusSubscriptionId: subscriptionId, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
}

/** Subscription ended (canceled/unpaid): drop the entitlement. */
export async function endPlus(subscriptionId: string): Promise<void> {
  const db = getDb();
  if (!db || !subscriptionId) return;
  await db
    .update(schema.users)
    .set({ isPlus: false, plusSubscriptionId: null, updatedAt: new Date() })
    .where(eq(schema.users.plusSubscriptionId, subscriptionId));
}

export const openBillingPortal = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; url?: string; error?: string }> => {
    const stripe = getStripe();
    if (!stripe) return { ok: false, error: "Payments are not configured." };
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false, error: "Sign in first." };
    const db = getDb();
    const [row] = db
      ? await db.select({ id: schema.users.stripeCustomerId }).from(schema.users).where(eq(schema.users.id, user.id)).limit(1)
      : [];
    if (!row?.id) return { ok: false, error: "No billing account yet." };
    const session = await stripe.billingPortal.sessions.create({
      customer: row.id,
      return_url: `${originOf()}/pricing`,
    });
    return { ok: true, url: session.url };
  },
);
