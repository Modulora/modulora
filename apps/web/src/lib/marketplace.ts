/**
 * Marketplace money flows on Stripe Connect (business model: Marketplace).
 *
 *  - Paid promotion: Modulora sells labeled featured placement (plain Checkout).
 *  - Paid listings:  buyer pays via Checkout with an application fee + a
 *                    destination transfer to the creator's connected account;
 *                    a paid purchase grants an install entitlement.
 *
 * Completion is confirmed two ways: synchronously on the success return (so it
 * works before webhooks are wired) and idempotently via the Stripe webhook.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { getStripe, applicationFee } from "./stripe";

/** Featured placement: flat price for a fixed window. */
export const FEATURED_PRICE_CENTS = 1200;
export const FEATURED_DAYS = 7;

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

/* ── Paid promotion ─────────────────────────────────────── */

export const startPromotion = createServerFn({ method: "POST" })
  .validator((data: { name: string }) => ({ name: String(data.name ?? "").trim().toLowerCase() }))
  .handler(async ({ data }): Promise<{ ok: boolean; url?: string; error?: string }> => {
    const stripe = getStripe();
    if (!stripe) return { ok: false, error: "Payments are not configured." };
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user?.username) return { ok: false, error: "Sign in first." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    const [ns] = await db.select({ id: schema.namespaces.id }).from(schema.namespaces).where(eq(schema.namespaces.name, user.username)).limit(1);
    if (!ns) return { ok: false, error: "Namespace missing." };
    const [component] = await db
      .select({ id: schema.components.id, title: schema.components.title, reviewStatus: schema.components.reviewStatus })
      .from(schema.components)
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.components.name, data.name)))
      .limit(1);
    if (!component) return { ok: false, error: "Component not found." };
    if (component.reviewStatus !== "approved") return { ok: false, error: "Only listed components can be promoted." };

    const [promo] = await db
      .insert(schema.promotions)
      .values({ componentId: component.id, ownerUserId: user.id, amount: FEATURED_PRICE_CENTS, status: "pending" })
      .returning({ id: schema.promotions.id });

    const origin = originOf();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/dashboard/components?promo={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/components`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: FEATURED_PRICE_CENTS,
            product_data: { name: `Featured placement — ${component.title} (${FEATURED_DAYS} days)` },
          },
        },
      ],
      metadata: { type: "promotion", promotionId: promo!.id },
    });

    await db.update(schema.promotions).set({ stripeCheckoutSessionId: session.id }).where(eq(schema.promotions.id, promo!.id));
    return { ok: true, url: session.url ?? undefined };
  });

/* ── Paid listing pricing ───────────────────────────────── */

export const setComponentPrice = createServerFn({ method: "POST" })
  .validator((data: { name: string; amount: number | null }) => ({
    name: String(data.name ?? "").trim().toLowerCase(),
    amount: data.amount === null ? null : Math.round(Number(data.amount)),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user?.username) return { ok: false, error: "Sign in first." };
    if (data.amount !== null && !user.payoutsEnabled) {
      return { ok: false, error: "Set up payouts before selling components." };
    }
    if (data.amount !== null && (data.amount < 100 || data.amount > 100000)) {
      return { ok: false, error: "Price must be between $1 and $1000." };
    }
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    const [ns] = await db.select({ id: schema.namespaces.id }).from(schema.namespaces).where(eq(schema.namespaces.name, user.username)).limit(1);
    if (!ns) return { ok: false, error: "Namespace missing." };
    const [component] = await db
      .select({ id: schema.components.id })
      .from(schema.components)
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.components.name, data.name)))
      .limit(1);
    if (!component) return { ok: false, error: "Component not found." };

    // Deactivate any existing price, then set the new one (null = free again).
    await db.update(schema.componentPrices).set({ active: false, updatedAt: new Date() }).where(eq(schema.componentPrices.componentId, component.id));
    if (data.amount !== null) {
      await db.insert(schema.componentPrices).values({ componentId: component.id, unitAmount: data.amount, currency: "usd", active: true });
    }
    return { ok: true };
  });

/* ── Buy a paid listing ─────────────────────────────────── */

export const buyComponent = createServerFn({ method: "POST" })
  .validator((data: { namespace: string; name: string }) => ({
    namespace: String(data.namespace ?? "").trim().toLowerCase(),
    name: String(data.name ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; url?: string; error?: string }> => {
    const stripe = getStripe();
    if (!stripe) return { ok: false, error: "Payments are not configured." };
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false, error: "Sign in to buy." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    const [row] = await db
      .select({ component: schema.components, sellerId: schema.namespaces.ownerUserId, price: schema.componentPrices })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .leftJoin(schema.componentPrices, and(eq(schema.componentPrices.componentId, schema.components.id), eq(schema.componentPrices.active, true)))
      .where(and(eq(schema.namespaces.name, data.namespace), eq(schema.components.name, data.name)))
      .limit(1);
    if (!row?.price || !row.sellerId) return { ok: false, error: "This component isn't for sale." };
    if (row.sellerId === user.id) return { ok: false, error: "You own this component." };

    const [seller] = await db.select({ stripeAccountId: schema.users.stripeAccountId, payoutsEnabled: schema.users.payoutsEnabled }).from(schema.users).where(eq(schema.users.id, row.sellerId)).limit(1);
    if (!seller?.stripeAccountId || !seller.payoutsEnabled) return { ok: false, error: "The seller can't accept payments yet." };

    const [existing] = await db
      .select({ id: schema.purchases.id })
      .from(schema.purchases)
      .where(and(eq(schema.purchases.componentId, row.component.id), eq(schema.purchases.buyerUserId, user.id), eq(schema.purchases.status, "paid")))
      .limit(1);
    if (existing) return { ok: false, error: "You already own this." };

    const amount = row.price.unitAmount;
    const fee = applicationFee(amount);
    const [purchase] = await db
      .insert(schema.purchases)
      .values({ componentId: row.component.id, buyerUserId: user.id, sellerUserId: row.sellerId, amount, feeAmount: fee, currency: "usd", status: "pending" })
      .returning({ id: schema.purchases.id });

    const origin = originOf();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/components/${data.namespace}/${data.name}?purchase={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/components/${data.namespace}/${data.name}`,
      line_items: [
        { quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name: row.component.title } } },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: seller.stripeAccountId },
      },
      metadata: { type: "purchase", purchaseId: purchase!.id },
    });

    await db.update(schema.purchases).set({ stripeCheckoutSessionId: session.id }).where(eq(schema.purchases.id, purchase!.id));
    return { ok: true, url: session.url ?? undefined };
  });

/* ── Confirm on success return (idempotent; webhook mirrors) ─ */

export async function fulfilCheckout(sessionId: string): Promise<void> {
  const stripe = getStripe();
  const db = getDb();
  if (!stripe || !db || !sessionId) return;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return;
  const meta = session.metadata ?? {};

  if (meta.type === "promotion" && meta.promotionId) {
    const now = new Date();
    const ends = new Date(now.getTime() + FEATURED_DAYS * 86400_000);
    await db
      .update(schema.promotions)
      .set({ status: "active", startsAt: now, endsAt: ends })
      .where(and(eq(schema.promotions.id, meta.promotionId), eq(schema.promotions.status, "pending")));
  } else if (meta.type === "purchase" && meta.purchaseId) {
    await db
      .update(schema.purchases)
      .set({ status: "paid", stripePaymentIntentId: (session.payment_intent as string) ?? null })
      .where(and(eq(schema.purchases.id, meta.purchaseId), eq(schema.purchases.status, "pending")));
  }
}

/** Confirm a Checkout on the success page (server fn wrapper). */
export const confirmCheckout = createServerFn({ method: "POST" })
  .validator((data: { sessionId: string }) => ({ sessionId: String(data.sessionId ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await fulfilCheckout(data.sessionId);
    return { ok: true };
  });

/** Does the viewer have an install entitlement (owner or paid)? */
export async function hasEntitlement(componentId: string, userId: string | null, sellerId: string | null): Promise<boolean> {
  if (userId && sellerId && userId === sellerId) return true;
  if (!userId) return false;
  const db = getDb();
  if (!db) return false;
  const [row] = await db
    .select({ id: schema.purchases.id })
    .from(schema.purchases)
    .where(and(eq(schema.purchases.componentId, componentId), eq(schema.purchases.buyerUserId, userId), eq(schema.purchases.status, "paid")))
    .limit(1);
  return Boolean(row);
}
