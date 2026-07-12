/**
 * Install receipts from the Modulora CLI. POST after a successful `modulora
 * add`. The server independently re-checks the reported digest against the
 * published digest — `verified` is a server-side conclusion, never trusted
 * from the client. Receipts are best-effort for the CLI (an install never
 * fails because a receipt did) but strict here: unknown components 404.
 */
import { createFileRoute } from "@tanstack/react-router";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "@/lib/session";
import { alphaGateActive } from "@/lib/access";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const bad = (status: number, error: string) =>
  new Response(JSON.stringify({ ok: false, error }), { status, headers: JSON_HEADERS });

async function handle({ request }: { request: Request }) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return bad(503, "Receipts unavailable");
  if (alphaGateActive() && !(await getCurrentUser(request))) return bad(401, "Authentication required during the alpha");
  let body: { namespace?: string; name?: string; version?: string; digest?: string; client?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return bad(400, "Invalid JSON");
  }
  const namespace = String(body.namespace ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim().toLowerCase();
  const version = String(body.version ?? "").trim().slice(0, 64);
  const digest = String(body.digest ?? "").trim().toLowerCase();
  const client = String(body.client ?? "modulora-cli").trim().slice(0, 40);
  if (!namespace || !name || !/^[0-9a-f]{64}$/.test(digest)) {
    return bad(400, "namespace, name, and a sha256 digest are required");
  }

  const db = drizzle(neon(databaseUrl), { schema });
  const [row] = await db
    .select({ component: schema.components, latest: schema.componentVersions })
    .from(schema.components)
    .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
    .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
    .where(and(eq(schema.namespaces.name, namespace), eq(schema.components.name, name)))
    .limit(1);
  if (!row) return bad(404, "Component not found");

  // Resolve the version the receipt claims (fall back to latest).
  let versionRow = row.latest;
  if (version && version !== row.latest?.version) {
    const [v] = await db
      .select()
      .from(schema.componentVersions)
      .where(and(eq(schema.componentVersions.componentId, row.component.id), eq(schema.componentVersions.version, version)))
      .limit(1);
    versionRow = v ?? null;
  }

  // Server-side verification: the receipt digest must equal the published one.
  const verified = Boolean(versionRow?.contentSha256 && versionRow.contentSha256 === digest);

  const user = await getCurrentUser(request);
  await db.insert(schema.installReceipts).values({
    componentId: row.component.id,
    componentVersionId: versionRow?.id ?? null,
    userId: user?.id ?? null,
    version: versionRow?.version ?? version,
    digest,
    verified,
    client,
  });

  return new Response(JSON.stringify({ ok: true, verified }), { headers: JSON_HEADERS });
}

export const Route = createFileRoute("/api/install-receipt")({
  server: { handlers: { POST: handle } },
});
