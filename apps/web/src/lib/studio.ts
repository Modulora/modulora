/**
 * Studio data for the creator dashboard. Reads the signed-in user's namespace
 * and rolls up their catalog counts. Returns null when signed out so the route
 * can redirect. Never throws when the DB/auth is unconfigured.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, count, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { isOwnerUser } from "./access";

export interface StudioSummary {
  user: {
    name: string;
    username: string | null;
    image: string | null;
  };
  namespace: string | null;
  counts: {
    listings: number;
    libraries: number;
    verifiedInstalls: number;
  };
  /** Role-gated dashboard surfaces. */
  roles: {
    curator: boolean;
    owner: boolean;
  };
  /** The earning journey, from real state — drives the Overview checklist. */
  journey: {
    published: boolean;
    approved: boolean;
    payouts: boolean;
    priced: boolean;
  };
}

export const fetchStudioSummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<StudioSummary | null> => {
    const request = getRequest();
    if (!request) return null;
    const user = await getCurrentUser(request);
    if (!user) return null;

    const summary: StudioSummary = {
      user: { name: user.name, username: user.username, image: user.image },
      namespace: user.username,
      counts: { listings: 0, libraries: 0, verifiedInstalls: 0 },
      roles: { curator: user.isCurator ?? false, owner: isOwnerUser(user.id) },
      journey: { published: false, approved: false, payouts: user.payoutsEnabled ?? false, priced: false },
    };

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || !user.username) return summary;

    try {
      const db = drizzle(neon(databaseUrl), { schema });
      const [ns] = await db
        .select({ id: schema.namespaces.id })
        .from(schema.namespaces)
        .where(eq(schema.namespaces.name, user.username))
        .limit(1);
      if (ns) {
        // Count every listing kind. Components and tools/sites are the first
        // kinds, and future kinds remain included without dashboard changes.
        const [row] = await db
          .select({ total: count() })
          .from(schema.components)
          .where(eq(schema.components.namespaceId, ns.id));
        summary.counts.listings = row?.total ?? 0;
        summary.journey.published = summary.counts.listings > 0;

        const [approved] = await db
          .select({ total: count() })
          .from(schema.components)
          .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.components.reviewStatus, "approved")));
        summary.journey.approved = (approved?.total ?? 0) > 0;

        const [priced] = await db
          .select({ total: count() })
          .from(schema.componentPrices)
          .innerJoin(schema.components, eq(schema.components.id, schema.componentPrices.componentId))
          .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.componentPrices.active, true)));
        summary.journey.priced = (priced?.total ?? 0) > 0;

        const [installs] = await db
          .select({ total: count() })
          .from(schema.installReceipts)
          .innerJoin(schema.components, eq(schema.components.id, schema.installReceipts.componentId))
          .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.installReceipts.verified, true)));
        summary.counts.verifiedInstalls = installs?.total ?? 0;
      }
    } catch {
      // Counts are best-effort; an empty studio still renders.
    }

    return summary;
  },
);
