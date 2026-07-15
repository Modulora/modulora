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
import { and, eq, isNotNull } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { getStripe, applicationFee } from "./stripe";
import { LICENSE_TEMPLATES, resolveLicenseText } from "./license";
import { DIRECT_MARKETPLACE_ENABLED, EXTERNAL_DOMAIN_VERIFICATION_REQUIRED } from "./flags";
import { externalDomainAllowed } from "./external-sales";
import { requestOrigin } from "./request-origin";

const MARKETPLACE_DISABLED_ERROR = "Direct sales through Modulora are not available during alpha.";

/** Featured placement: flat price for a fixed window. */
export const FEATURED_PRICE_CENTS = 1200;
export const FEATURED_DAYS = 7;

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}
export const originOf = requestOrigin;

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
    if (!component) return { ok: false, error: "Listing not found." };
    if (component.reviewStatus !== "approved") return { ok: false, error: "Only approved listings can be boosted." };

    const [promo] = await db
      .insert(schema.promotions)
      .values({ componentId: component.id, ownerUserId: user.id, amount: FEATURED_PRICE_CENTS, status: "pending" })
      .returning({ id: schema.promotions.id });

    const origin = originOf(request);
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
  .validator((data: { name: string; amount: number | null; licenseTemplate?: string; licenseText?: string }) => ({
    name: String(data.name ?? "").trim().toLowerCase(),
    amount: data.amount === null ? null : Math.round(Number(data.amount)),
    licenseTemplate: String(data.licenseTemplate ?? "modulora-commercial-v1"),
    licenseText: String(data.licenseText ?? "").trim().slice(0, 20000),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!DIRECT_MARKETPLACE_ENABLED) return { ok: false, error: MARKETPLACE_DISABLED_ERROR };
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user?.username) return { ok: false, error: "Sign in first." };
    if (data.amount !== null && !user.payoutsEnabled) {
      return { ok: false, error: "Set up payouts before selling components." };
    }
    if (data.amount !== null && (data.amount < 100 || data.amount > 100000)) {
      return { ok: false, error: "Price must be between $1 and $1000." };
    }
    if (data.amount !== null && !LICENSE_TEMPLATES.some((t) => t.id === data.licenseTemplate)) {
      return { ok: false, error: "Unknown license template." };
    }
    if (data.amount !== null && data.licenseTemplate === "custom" && data.licenseText.length < 40) {
      return { ok: false, error: "Custom license terms must be at least 40 characters." };
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
      await db.insert(schema.componentPrices).values({
        componentId: component.id,
        unitAmount: data.amount,
        currency: "usd",
        active: true,
        licenseTemplate: data.licenseTemplate,
        licenseText: data.licenseTemplate === "custom" ? data.licenseText : null,
      });
    }
    return { ok: true };
  });

/* ── Buy a paid listing ─────────────────────────────────── */

export const buyComponent = createServerFn({ method: "POST" })
  .validator((data: { namespace: string; name: string; acceptLicense?: boolean }) => ({
    namespace: String(data.namespace ?? "").trim().toLowerCase(),
    name: String(data.name ?? "").trim().toLowerCase(),
    acceptLicense: Boolean(data.acceptLicense),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; url?: string; error?: string }> => {
    if (!DIRECT_MARKETPLACE_ENABLED) return { ok: false, error: MARKETPLACE_DISABLED_ERROR };
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
    if (!data.acceptLicense) return { ok: false, error: "You must agree to the seller's license terms first." };

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
      .values({
        componentId: row.component.id,
        buyerUserId: user.id,
        sellerUserId: row.sellerId,
        amount,
        feeAmount: fee,
        currency: "usd",
        status: "pending",
        // Provable agreement log: exactly what the buyer accepted, and when.
        licenseTemplate: row.price.licenseTemplate,
        licenseTextSnapshot: resolveLicenseText(row.price.licenseTemplate, row.price.licenseText),
        licenseAcceptedAt: new Date(),
      })
      .returning({ id: schema.purchases.id });

    const origin = originOf(request);
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
    const [paid] = await db
      .update(schema.purchases)
      .set({ status: "paid", stripePaymentIntentId: (session.payment_intent as string) ?? null })
      .where(and(eq(schema.purchases.id, meta.purchaseId), eq(schema.purchases.status, "pending")))
      .returning();
    if (paid) await sendPurchaseEmails(db, paid.componentId, paid.buyerUserId, paid.sellerUserId, paid.amount, paid.feeAmount);
  } else if (meta.type === "collection-purchase" && meta.collectionPurchaseId) {
    await fulfilCollectionPurchase(meta.collectionPurchaseId, (session.payment_intent as string) ?? null);
  } else if (meta.type === "plus" && meta.userId) {
    const { fulfilPlusCheckout } = await import("./plus");
    await fulfilPlusCheckout(meta.userId, (session.subscription as string) ?? null);
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

/* ── Collections: bundle pricing + purchase ─────────────── */

export const setCollectionPrice = createServerFn({ method: "POST" })
  .validator((data: { name: string; amount: number | null; licenseTemplate?: string; licenseText?: string }) => ({
    name: String(data.name ?? "").trim().toLowerCase(),
    amount: data.amount === null ? null : Math.round(Number(data.amount)),
    licenseTemplate: String(data.licenseTemplate ?? "modulora-commercial-v1"),
    licenseText: String(data.licenseText ?? "").trim().slice(0, 20000),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!DIRECT_MARKETPLACE_ENABLED) return { ok: false, error: MARKETPLACE_DISABLED_ERROR };
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user?.username) return { ok: false, error: "Sign in first." };
    if (data.amount !== null && !user.payoutsEnabled) {
      return { ok: false, error: "Set up payouts before selling." };
    }
    if (data.amount !== null && (data.amount < 100 || data.amount > 500000)) {
      return { ok: false, error: "Price must be between $1 and $5000." };
    }
    if (data.amount !== null && !LICENSE_TEMPLATES.some((t) => t.id === data.licenseTemplate)) {
      return { ok: false, error: "Unknown license template." };
    }
    if (data.amount !== null && data.licenseTemplate === "custom" && data.licenseText.length < 40) {
      return { ok: false, error: "Custom license terms must be at least 40 characters." };
    }
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    const [row] = await db
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.collections.namespaceId))
      .where(and(eq(schema.namespaces.name, user.username), eq(schema.collections.name, data.name)))
      .limit(1);
    if (!row) return { ok: false, error: "Collection not found." };

    await db.update(schema.collectionPrices).set({ active: false, updatedAt: new Date() }).where(eq(schema.collectionPrices.collectionId, row.id));
    if (data.amount !== null) {
      // Mutually exclusive with an external listing.
      await db.update(schema.collections).set({ externalUrl: null, updatedAt: new Date() }).where(eq(schema.collections.id, row.id));
    }
    if (data.amount !== null) {
      await db.insert(schema.collectionPrices).values({
        collectionId: row.id,
        unitAmount: data.amount,
        currency: "usd",
        active: true,
        licenseTemplate: data.licenseTemplate,
        licenseText: data.licenseTemplate === "custom" ? data.licenseText : null,
      });
    }
    return { ok: true };
  });

/**
 * List a collection as sold on the creator's own site. Setting the URL
 * deactivates any Modulora price (mutually exclusive). Pass null to clear.
 */
export const setCollectionExternalUrl = createServerFn({ method: "POST" })
  .validator((data: { name: string; url: string | null }) => ({
    name: String(data.name ?? "").trim().toLowerCase(),
    url: data.url === null ? null : String(data.url).trim(),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user?.username) return { ok: false, error: "Sign in first." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    if (data.url !== null) {
      if (!/^https?:\/\//i.test(data.url)) return { ok: false, error: "Enter a full URL (https://…)." };
      const { normalizeDomain } = await import("./domains");
      const host = normalizeDomain(data.url);
      if (!host) return { ok: false, error: "Enter a valid external purchase URL." };
      if (EXTERNAL_DOMAIN_VERIFICATION_REQUIRED) {
        const owned = await db
          .select({ id: schema.verifiedDomains.id })
          .from(schema.verifiedDomains)
          .where(
            and(
              eq(schema.verifiedDomains.ownerUserId, user.id),
              eq(schema.verifiedDomains.domain, host),
              isNotNull(schema.verifiedDomains.verifiedAt),
            ),
          )
          .limit(1);
        if (!externalDomainAllowed(owned.length > 0)) {
          return { ok: false, error: `URL must be on a domain you've verified (${host ?? "invalid URL"}).` };
        }
      }
    }

    const [row] = await db
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.collections.namespaceId))
      .where(and(eq(schema.namespaces.name, user.username), eq(schema.collections.name, data.name)))
      .limit(1);
    if (!row) return { ok: false, error: "Collection not found." };

    if (data.url !== null) {
      // Mutually exclusive with a Modulora price.
      await db.update(schema.collectionPrices).set({ active: false, updatedAt: new Date() }).where(eq(schema.collectionPrices.collectionId, row.id));
    }
    await db.update(schema.collections).set({ externalUrl: data.url, updatedAt: new Date() }).where(eq(schema.collections.id, row.id));
    return { ok: true };
  });

export async function hasCollectionEntitlement(collectionId: string, viewerId: string | null, ownerUserId: string | null): Promise<boolean> {
  if (viewerId && ownerUserId && viewerId === ownerUserId) return true;
  if (!viewerId) return false;
  const db = getDb();
  if (!db) return false;
  const [row] = await db
    .select({ id: schema.collectionPurchases.id })
    .from(schema.collectionPurchases)
    .where(and(eq(schema.collectionPurchases.collectionId, collectionId), eq(schema.collectionPurchases.buyerUserId, viewerId), eq(schema.collectionPurchases.status, "paid")))
    .limit(1);
  return Boolean(row);
}

export const buyCollection = createServerFn({ method: "POST" })
  .validator((data: { namespace: string; name: string; acceptLicense?: boolean }) => ({
    namespace: String(data.namespace ?? "").trim().toLowerCase(),
    name: String(data.name ?? "").trim().toLowerCase(),
    acceptLicense: Boolean(data.acceptLicense),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; url?: string; error?: string }> => {
    if (!DIRECT_MARKETPLACE_ENABLED) return { ok: false, error: MARKETPLACE_DISABLED_ERROR };
    const stripe = getStripe();
    if (!stripe) return { ok: false, error: "Payments are not configured." };
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false, error: "Sign in to buy." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    const [row] = await db
      .select({ collection: schema.collections, sellerId: schema.namespaces.ownerUserId, price: schema.collectionPrices })
      .from(schema.collections)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.collections.namespaceId))
      .leftJoin(schema.collectionPrices, and(eq(schema.collectionPrices.collectionId, schema.collections.id), eq(schema.collectionPrices.active, true)))
      .where(and(eq(schema.namespaces.name, data.namespace), eq(schema.collections.name, data.name)))
      .limit(1);
    if (!row?.price || !row.sellerId) return { ok: false, error: "This collection isn't for sale." };
    if (row.sellerId === user.id) return { ok: false, error: "You own this collection." };
    if (!data.acceptLicense) return { ok: false, error: "You must agree to the seller's license terms first." };

    const [seller] = await db.select({ stripeAccountId: schema.users.stripeAccountId, payoutsEnabled: schema.users.payoutsEnabled }).from(schema.users).where(eq(schema.users.id, row.sellerId)).limit(1);
    if (!seller?.stripeAccountId || !seller.payoutsEnabled) return { ok: false, error: "The seller can't accept payments yet." };

    if (await hasCollectionEntitlement(row.collection.id, user.id, null)) return { ok: false, error: "You already own this." };

    const amount = row.price.unitAmount;
    const fee = applicationFee(amount);
    const [purchase] = await db
      .insert(schema.collectionPurchases)
      .values({
        collectionId: row.collection.id,
        buyerUserId: user.id,
        sellerUserId: row.sellerId,
        amount,
        feeAmount: fee,
        currency: "usd",
        status: "pending",
        licenseTemplate: row.price.licenseTemplate,
        licenseTextSnapshot: resolveLicenseText(row.price.licenseTemplate, row.price.licenseText),
        licenseAcceptedAt: new Date(),
      })
      .returning({ id: schema.collectionPurchases.id });

    const origin = originOf(request);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/${data.namespace}?purchase={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${data.namespace}`,
      line_items: [
        { quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name: `${row.collection.title} (collection)` } } },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: seller.stripeAccountId },
      },
      metadata: { type: "collection-purchase", collectionPurchaseId: purchase!.id },
    });

    await db.update(schema.collectionPurchases).set({ stripeCheckoutSessionId: session.id }).where(eq(schema.collectionPurchases.id, purchase!.id));
    return { ok: true, url: session.url ?? undefined };
  });

/**
 * Fulfil a collection purchase: mark the bundle paid and snapshot a paid
 * entitlement row for every CURRENT member component (amount 0 — the money
 * lives on the collection_purchases row). Later membership edits never
 * change what was bought.
 */
export async function fulfilCollectionPurchase(collectionPurchaseId: string, paymentIntentId: string | null): Promise<void> {
  const db = getDb();
  if (!db) return;
  const [updated] = await db
    .update(schema.collectionPurchases)
    .set({ status: "paid", stripePaymentIntentId: paymentIntentId })
    .where(and(eq(schema.collectionPurchases.id, collectionPurchaseId), eq(schema.collectionPurchases.status, "pending")))
    .returning();
  if (!updated) return;

  // Buyer + seller emails (fire-and-forget), with the collection's info.
  try {
    const email = await import("./email");
    const [collection] = await db
      .select({ title: schema.collections.title, name: schema.collections.name, namespace: schema.namespaces.name })
      .from(schema.collections)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.collections.namespaceId))
      .where(eq(schema.collections.id, updated.collectionId))
      .limit(1);
    if (collection) {
      const ref = `@${collection.namespace}/${collection.name}`;
      const [buyer] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, updated.buyerUserId)).limit(1);
      if (buyer) await email.emailPurchaseBuyer(buyer.email, `${collection.title} (collection)`, updated.amount, ref);
      const [seller] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, updated.sellerUserId)).limit(1);
      if (seller) await email.emailPurchaseSeller(seller.email, `${collection.title} (collection)`, updated.amount - updated.feeAmount);
    }
  } catch (error) {
    console.error("collection purchase emails failed", error);
  }

  const members = await db
    .select({ componentId: schema.collectionItems.componentId })
    .from(schema.collectionItems)
    .where(eq(schema.collectionItems.collectionId, updated.collectionId));
  for (const member of members) {
    await db
      .insert(schema.purchases)
      .values({
        componentId: member.componentId,
        buyerUserId: updated.buyerUserId,
        sellerUserId: updated.sellerUserId,
        amount: 0,
        feeAmount: 0,
        currency: updated.currency,
        status: "paid",
        licenseTemplate: updated.licenseTemplate,
        licenseTextSnapshot: updated.licenseTextSnapshot,
        licenseAcceptedAt: updated.licenseAcceptedAt,
        viaCollectionPurchaseId: updated.id,
      })
      .onConflictDoNothing();
  }
}


/** Buyer receipt + seller notification (fire-and-forget). */
async function sendPurchaseEmails(
  db: NonNullable<ReturnType<typeof getDb>>,
  componentId: string,
  buyerUserId: string,
  sellerUserId: string | null,
  amount: number,
  feeAmount: number,
): Promise<void> {
  try {
    const email = await import("./email");
    const [component] = await db
      .select({ title: schema.components.title, name: schema.components.name, namespace: schema.namespaces.name })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(eq(schema.components.id, componentId))
      .limit(1);
    if (!component) return;
    const ref = `@${component.namespace}/${component.name}`;
    const [buyer] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, buyerUserId)).limit(1);
    if (buyer) await email.emailPurchaseBuyer(buyer.email, component.title, amount, ref);
    if (sellerUserId) {
      const [seller] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, sellerUserId)).limit(1);
      if (seller) await email.emailPurchaseSeller(seller.email, component.title, amount - feeAmount);
    }
  } catch (error) {
    console.error("purchase emails failed", error);
  }
}
