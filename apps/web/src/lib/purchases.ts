/**
 * Buyer-side purchases: the components you own. Includes the license snapshot
 * agreed at checkout (the buyer's provable copy of the terms).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";

export interface OwnedComponent {
  id: string;
  namespace: string;
  name: string;
  title: string;
  description: string;
  amount: number;
  purchasedAt: string;
  licenseTemplate: string | null;
  licenseText: string | null;
  licenseAcceptedAt: string | null;
}

export const fetchMyPurchases = createServerFn({ method: "GET" }).handler(
  async (): Promise<OwnedComponent[]> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const databaseUrl = process.env.DATABASE_URL;
    if (!user || !databaseUrl) return [];
    const db = drizzle(neon(databaseUrl), { schema });

    const rows = await db
      .select({
        id: schema.purchases.id,
        amount: schema.purchases.amount,
        createdAt: schema.purchases.createdAt,
        licenseTemplate: schema.purchases.licenseTemplate,
        licenseText: schema.purchases.licenseTextSnapshot,
        licenseAcceptedAt: schema.purchases.licenseAcceptedAt,
        name: schema.components.name,
        title: schema.components.title,
        description: schema.components.description,
        namespace: schema.namespaces.name,
      })
      .from(schema.purchases)
      .innerJoin(schema.components, eq(schema.components.id, schema.purchases.componentId))
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(and(eq(schema.purchases.buyerUserId, user.id), eq(schema.purchases.status, "paid")))
      .orderBy(desc(schema.purchases.createdAt));

    return rows.map((r) => ({
      id: r.id,
      namespace: r.namespace,
      name: r.name,
      title: r.title,
      description: r.description,
      amount: r.amount,
      purchasedAt: r.createdAt.toISOString(),
      licenseTemplate: r.licenseTemplate,
      licenseText: r.licenseText,
      licenseAcceptedAt: r.licenseAcceptedAt?.toISOString() ?? null,
    }));
  },
);
