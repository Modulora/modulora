/**
 * Weekly creator digest — one email per creator with activity in the
 * last 7 days: views, verified installs, and sales. Runs from the
 * Worker cron (see src/worker.ts) or the owner-gated Admin button.
 * No activity → no email; we never send empty noise.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { isOwnerUser } from "./access";
import { sendEmail } from "./email";

export interface DigestResult {
  creators: number;
  sent: number;
}

export async function runWeeklyDigest(): Promise<DigestResult> {
  const url = process.env.DATABASE_URL;
  if (!url) return { creators: 0, sent: 0 };
  const db = drizzle(neon(url), { schema });
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Creators = owners of at least one approved component.
  const creators = await db
    .select({
      userId: schema.namespaces.ownerUserId,
      namespace: schema.namespaces.name,
      email: schema.users.email,
    })
    .from(schema.namespaces)
    .innerJoin(schema.users, eq(schema.users.id, schema.namespaces.ownerUserId))
    .where(
      inArray(
        schema.namespaces.id,
        db
          .select({ id: schema.components.namespaceId })
          .from(schema.components)
          .where(eq(schema.components.reviewStatus, "approved")),
      ),
    );

  let sent = 0;
  for (const creator of creators) {
    if (!creator.userId || !creator.email) continue;

    const componentIds = db
      .select({ id: schema.components.id })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(eq(schema.namespaces.ownerUserId, creator.userId));

    const [views] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.componentViews)
      .where(and(inArray(schema.componentViews.componentId, componentIds), gte(schema.componentViews.createdAt, since)));
    const [installs] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.installReceipts)
      .where(and(inArray(schema.installReceipts.componentId, componentIds), gte(schema.installReceipts.createdAt, since)));
    const [sales] = await db
      .select({ n: sql<number>`count(*)::int`, cents: sql<number>`coalesce(sum(${schema.purchases.amount}), 0)::int` })
      .from(schema.purchases)
      .where(and(inArray(schema.purchases.componentId, componentIds), eq(schema.purchases.status, "paid"), gte(schema.purchases.createdAt, since)));

    const v = views?.n ?? 0;
    const i = installs?.n ?? 0;
    const salesCount = sales?.n ?? 0;
    const cents = sales?.cents ?? 0;
    if (v === 0 && i === 0 && salesCount === 0) continue;

    const parts = [
      `${v} view${v === 1 ? "" : "s"}`,
      `${i} verified install${i === 1 ? "" : "s"}`,
      salesCount > 0 ? `${salesCount} sale${salesCount === 1 ? "" : "s"} ($${(cents / 100).toFixed(2)})` : null,
    ].filter(Boolean);

    await sendEmail({
      to: creator.email,
      subject: `Your week on Modulora: ${parts.join(" · ")}`,
      heading: "Your last 7 days",
      body: [
        `@${creator.namespace} had ${parts.join(", ")} this week.`,
        "Verified installs count toward your profit share; the analytics page has the per-component breakdown.",
      ],
      cta: { label: "Open analytics", url: "https://modulora.dev/dashboard/analytics" },
    });
    sent += 1;
  }

  return { creators: creators.length, sent };
}

/** Manual trigger for owners (and for testing the cron path in dev). */
export const runWeeklyDigestNow = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; error?: string; result?: DigestResult }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user || !isOwnerUser(user.id)) return { ok: false, error: "Owners only." };
    const result = await runWeeklyDigest();
    return { ok: true, result };
  },
);
