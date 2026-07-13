/**
 * Marketplace pricing math — client-safe (no Stripe SDK). Single source of
 * truth for the fee split used by the server charge and the price calculator.
 *
 * Creators keep (100 − fee)% of the sale price. Modulora's fee also covers
 * payment processing, so the creator's net is exactly price − fee.
 */
export const MARKETPLACE_FEE_PERCENT = 10;

/** Modulora's fee in minor units for a given price (minor units). */
export function platformFee(priceCents: number): number {
  return Math.round((priceCents * MARKETPLACE_FEE_PERCENT) / 100);
}

/** What the creator receives (minor units). */
export function creatorNet(priceCents: number): number {
  return priceCents - platformFee(priceCents);
}
