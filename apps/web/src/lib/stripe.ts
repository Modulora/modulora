/**
 * Stripe client for the revenue spine (Stripe Connect).
 *
 * Activates only when STRIPE_SECRET_KEY is set — the rest of the app runs fine
 * without it, so payments can be developed behind test keys and shipped later.
 *
 * Streams:
 *   - Paid promotion  → Modulora sells featured placement (plain Checkout).
 *   - Paid listings   → Checkout with application_fee_amount + transfer_data to
 *                       the creator's connected account (marketplace split).
 *   - Payouts         → Connect Express accounts handle creator KYC + payouts.
 *
 * Uses fetch-based HTTP (httpClient) so it runs on the Cloudflare Worker.
 */
import Stripe from "stripe";

let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key
    ? new Stripe(key, {
        // Pin the API version; bump deliberately.
        apiVersion: "2026-06-24.dahlia",
        httpClient: Stripe.createFetchHttpClient(),
      })
    : null;
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Modulora's marketplace take on a paid component sale (basis points). */
export const MARKETPLACE_FEE_BPS = 3000; // 30% to Modulora before the OSS/creator split (#32)

export function applicationFee(amountCents: number): number {
  return Math.round((amountCents * MARKETPLACE_FEE_BPS) / 10000);
}
