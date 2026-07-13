/**
 * Stripe webhook — reliable, idempotent fulfilment.
 *   - checkout.session.completed → activate promotion / mark purchase paid.
 *   - account.updated            → sync a creator's payouts_enabled.
 * Signature is verified with STRIPE_WEBHOOK_SECRET.
 */
import { createFileRoute } from "@tanstack/react-router";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getStripe } from "@/lib/stripe";
import { fulfilCheckout } from "@/lib/marketplace";

async function handle({ request }: { request: Request }) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("not configured", { status: 503 });

  const sig = request.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  const body = await request.text();
  let event;
  try {
    // Async variant uses Web Crypto — required on the Worker runtime.
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as { id: string };
      await fulfilCheckout(session.id);
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as { id: string };
      const { endPlus } = await import("@/lib/plus");
      await endPlus(sub.id);
    } else if (event.type === "account.updated") {
      const account = event.data.object as { id: string; payouts_enabled?: boolean; details_submitted?: boolean };
      const url = process.env.DATABASE_URL;
      if (url) {
        const db = drizzle(neon(url), { schema });
        const enabled = Boolean(account.payouts_enabled && account.details_submitted);
        const [before] = await db
          .select({ email: schema.users.email, was: schema.users.payoutsEnabled })
          .from(schema.users)
          .where(eq(schema.users.stripeAccountId, account.id))
          .limit(1);
        await db
          .update(schema.users)
          .set({ payoutsEnabled: enabled, updatedAt: new Date() })
          .where(eq(schema.users.stripeAccountId, account.id));
        if (before && enabled && !before.was) {
          const { emailPayoutsActive } = await import("@/lib/email");
          await emailPayoutsActive(before.email);
        }
      }
    }
  } catch (error) {
    console.error("stripe webhook handler failed", error);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "content-type": "application/json" } });
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: { handlers: { POST: handle } },
});
