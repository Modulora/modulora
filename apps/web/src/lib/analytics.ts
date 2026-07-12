/**
 * Creator analytics: views and verified installs per component. Honest
 * numbers only — views are page views of the public detail page (owner
 * visits excluded); installs are digest-verified CLI installs. Views never
 * affect earnings.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, sql as dsql } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";

export interface ComponentAnalytics {
  name: string;
  title: string;
  reviewStatus: string;
  views: number;
  verifiedInstalls: number;
  sales: number;
}

export interface CreatorAnalytics {
  totals: { views: number; verifiedInstalls: number; sales: number };
  components: ComponentAnalytics[];
}

export const fetchCreatorAnalytics = createServerFn({ method: "GET" }).handler(
  async (): Promise<CreatorAnalytics | null> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const databaseUrl = process.env.DATABASE_URL;
    if (!user?.username || !databaseUrl) return null;
    const db = drizzle(neon(databaseUrl), { schema });

    const [ns] = await db
      .select({ id: schema.namespaces.id })
      .from(schema.namespaces)
      .where(eq(schema.namespaces.name, user.username))
      .limit(1);
    if (!ns) return null;

    const components = await db
      .select({ id: schema.components.id, name: schema.components.name, title: schema.components.title, reviewStatus: schema.components.reviewStatus })
      .from(schema.components)
      .where(eq(schema.components.namespaceId, ns.id))
      .orderBy(desc(schema.components.updatedAt));

    // Grouped counts, merged in JS — simple, transparent SQL.
    const viewCounts = await db
      .select({ componentId: schema.componentViews.componentId, total: dsql<number>`count(*)::int` })
      .from(schema.componentViews)
      .innerJoin(schema.components, eq(schema.components.id, schema.componentViews.componentId))
      .where(eq(schema.components.namespaceId, ns.id))
      .groupBy(schema.componentViews.componentId);
    const installCounts = await db
      .select({ componentId: schema.installReceipts.componentId, total: dsql<number>`count(*)::int` })
      .from(schema.installReceipts)
      .innerJoin(schema.components, eq(schema.components.id, schema.installReceipts.componentId))
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.installReceipts.verified, true)))
      .groupBy(schema.installReceipts.componentId);
    const saleCounts = await db
      .select({ componentId: schema.purchases.componentId, total: dsql<number>`count(*)::int` })
      .from(schema.purchases)
      .innerJoin(schema.components, eq(schema.components.id, schema.purchases.componentId))
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.purchases.status, "paid")))
      .groupBy(schema.purchases.componentId);

    const byId = (list: { componentId: string; total: number }[]) =>
      new Map(list.map((row) => [row.componentId, row.total]));
    const views = byId(viewCounts);
    const installs = byId(installCounts);
    const sales = byId(saleCounts);

    const rows = components.map((component) => ({
      name: component.name,
      title: component.title,
      reviewStatus: component.reviewStatus,
      views: views.get(component.id) ?? 0,
      verifiedInstalls: installs.get(component.id) ?? 0,
      sales: sales.get(component.id) ?? 0,
    }));

    return {
      totals: {
        views: rows.reduce((sum, r) => sum + r.views, 0),
        verifiedInstalls: rows.reduce((sum, r) => sum + r.verifiedInstalls, 0),
        sales: rows.reduce((sum, r) => sum + r.sales, 0),
      },
      components: rows,
    };
  },
);
