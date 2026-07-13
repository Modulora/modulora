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
import { platformFee } from "./pricing";

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

/**
 * Marketplace take (Stripe application fee). Creators keep the rest; Modulora
 * covers payment processing from its fee. Rate lives in ./pricing so the price
 * calculator and the charge stay in sync. Separate from the distributable-
 * profit pool (60/30/10, #32).
 */
export function applicationFee(amountCents: number): number {
  return platformFee(amountCents);
}
