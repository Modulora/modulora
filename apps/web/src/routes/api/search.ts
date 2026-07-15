/**
 * Public search API — powers `modulora search` and agent discovery. Returns
 * approved, public components only. No auth required.
 */
import { createFileRoute } from "@tanstack/react-router";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, ilike, or, sql as dsql } from "drizzle-orm";
import { schema } from "@modulora/db";
import { DIRECT_MARKETPLACE_ENABLED } from "@/lib/flags";
import { alphaGateActive } from "@/lib/access";
import { getCurrentUser } from "@/lib/session";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=60",
};

async function handle({ request }: { request: Request }) {
  if (alphaGateActive() && !(await getCurrentUser(request))) {
    return new Response(JSON.stringify({ error: "Authentication required during the alpha." }), {
      status: 401,
      headers: { ...JSON_HEADERS, "cache-control": "no-store" },
    });
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response(JSON.stringify({ results: [] }), { headers: JSON_HEADERS });
  }
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);

  const db = drizzle(neon(databaseUrl), { schema });
  const filters = [
    eq(schema.components.visibility, "public"),
    eq(schema.components.reviewStatus, "approved"),
  ];
  if (q) {
    filters.push(
      or(
        ilike(schema.components.title, `%${q}%`),
        ilike(schema.components.name, `%${q}%`),
        ilike(schema.components.description, `%${q}%`),
      )!,
    );
  }

  const rows = await db
    .select({
      name: schema.components.name,
      title: schema.components.title,
      description: schema.components.description,
      category: schema.components.category,
      sourceModel: schema.components.sourceModel,
      namespace: schema.namespaces.name,
      price: dsql<number | null>`(
        select cp.unit_amount from component_prices cp
        where cp.component_id = ${schema.components.id} and cp.active
        limit 1
      )`,
    })
    .from(schema.components)
    .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
    .where(and(...filters))
    .orderBy(desc(schema.components.updatedAt))
    .limit(limit);

  const results = rows.map((row) => ({
    ref: `@${row.namespace}/${row.name}`,
    title: row.title,
    description: row.description,
    category: row.category,
    // Paid = marketplace price or external-commercial listing.
    paid: (DIRECT_MARKETPLACE_ENABLED && row.price != null) || (row.sourceModel !== "open-source" && row.sourceModel !== "external-site"),
    price: DIRECT_MARKETPLACE_ENABLED ? row.price : null,
    url: `https://modulora.dev/components/${row.namespace}/${row.name}`,
  }));

  return new Response(JSON.stringify({ query: q, results }, null, 2), { headers: JSON_HEADERS });
}

export const Route = createFileRoute("/api/search")({
  server: { handlers: { GET: handle } },
});
