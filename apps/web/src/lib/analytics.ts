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
import { hasFeature } from "./flags";

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

/** Daily time series (last 30 days) — the Plus-early "deeper analytics". */
export interface AnalyticsSeriesPoint {
  date: string; // YYYY-MM-DD
  views: number;
  installs: number;
  sales: number;
}

export const fetchAnalyticsSeries = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ enabled: boolean; series: AnalyticsSeriesPoint[] }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const databaseUrl = process.env.DATABASE_URL;
    if (!user?.username || !databaseUrl) return { enabled: false, series: [] };
    if (!hasFeature(user, "deep-analytics")) return { enabled: false, series: [] };
    const db = drizzle(neon(databaseUrl), { schema });

    const [ns] = await db
      .select({ id: schema.namespaces.id })
      .from(schema.namespaces)
      .where(eq(schema.namespaces.name, user.username))
      .limit(1);
    if (!ns) return { enabled: true, series: [] };

    const since = new Date(Date.now() - 30 * 86400_000);
    const day = (col: unknown) => dsql<string>`to_char(date_trunc('day', ${col}), 'YYYY-MM-DD')`;

    const viewRows = await db
      .select({ date: day(schema.componentViews.createdAt), total: dsql<number>`count(*)::int` })
      .from(schema.componentViews)
      .innerJoin(schema.components, eq(schema.components.id, schema.componentViews.componentId))
      .where(and(eq(schema.components.namespaceId, ns.id), dsql`${schema.componentViews.createdAt} >= ${since}`))
      .groupBy(day(schema.componentViews.createdAt));
    const installRows = await db
      .select({ date: day(schema.installReceipts.createdAt), total: dsql<number>`count(*)::int` })
      .from(schema.installReceipts)
      .innerJoin(schema.components, eq(schema.components.id, schema.installReceipts.componentId))
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.installReceipts.verified, true), dsql`${schema.installReceipts.createdAt} >= ${since}`))
      .groupBy(day(schema.installReceipts.createdAt));
    const saleRows = await db
      .select({ date: day(schema.purchases.createdAt), total: dsql<number>`count(*)::int` })
      .from(schema.purchases)
      .innerJoin(schema.components, eq(schema.components.id, schema.purchases.componentId))
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.purchases.status, "paid"), dsql`${schema.purchases.createdAt} >= ${since}`))
      .groupBy(day(schema.purchases.createdAt));

    const views = new Map(viewRows.map((r) => [r.date, r.total]));
    const installs = new Map(installRows.map((r) => [r.date, r.total]));
    const sales = new Map(saleRows.map((r) => [r.date, r.total]));

    const series: AnalyticsSeriesPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      series.push({
        date,
        views: views.get(date) ?? 0,
        installs: installs.get(date) ?? 0,
        sales: sales.get(date) ?? 0,
      });
    }
    return { enabled: true, series };
  },
);
