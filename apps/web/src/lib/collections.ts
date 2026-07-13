/**
 * Collections — creator-curated groups of their own components. Collections
 * hold no source: only approved + public members ever serve, so curation is
 * inherited from component review. Names share the /r/ namespace with
 * components, so collisions are refused at create time.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, asc, desc, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";

const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

async function ownNamespace(db: NonNullable<ReturnType<typeof getDb>>, username: string) {
  const [ns] = await db
    .select({ id: schema.namespaces.id })
    .from(schema.namespaces)
    .where(eq(schema.namespaces.name, username))
    .limit(1);
  return ns ?? null;
}

export interface MyCollection {
  id: string;
  name: string;
  title: string;
  description: string;
  price: number | null;
  externalUrl: string | null;
  items: { componentId: string; name: string; title: string; reviewStatus: string }[];
}

export const fetchMyCollections = createServerFn({ method: "GET" }).handler(
  async (): Promise<MyCollection[]> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user?.username || !db) return [];
    const ns = await ownNamespace(db, user.username);
    if (!ns) return [];

    const rows = await db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.namespaceId, ns.id))
      .orderBy(desc(schema.collections.updatedAt));

    const out: MyCollection[] = [];
    for (const collection of rows) {
      const items = await db
        .select({
          componentId: schema.collectionItems.componentId,
          name: schema.components.name,
          title: schema.components.title,
          reviewStatus: schema.components.reviewStatus,
        })
        .from(schema.collectionItems)
        .innerJoin(schema.components, eq(schema.components.id, schema.collectionItems.componentId))
        .where(eq(schema.collectionItems.collectionId, collection.id))
        .orderBy(asc(schema.collectionItems.orderIndex));
      const [price] = await db
        .select({ unitAmount: schema.collectionPrices.unitAmount })
        .from(schema.collectionPrices)
        .where(and(eq(schema.collectionPrices.collectionId, collection.id), eq(schema.collectionPrices.active, true)))
        .limit(1);
      out.push({ id: collection.id, name: collection.name, title: collection.title, description: collection.description, price: price?.unitAmount ?? null, externalUrl: collection.externalUrl ?? null, items });
    }
    return out;
  },
);

export const saveCollection = createServerFn({ method: "POST" })
  .validator((data: { name: string; title: string; description: string; componentNames: string[] }) => ({
    name: String(data.name ?? "").trim().toLowerCase(),
    title: String(data.title ?? "").trim().slice(0, 80),
    description: String(data.description ?? "").trim().slice(0, 280),
    componentNames: Array.isArray(data.componentNames) ? data.componentNames.map((n) => String(n).trim().toLowerCase()).slice(0, 50) : [],
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user?.username || !db) return { ok: false, error: "Sign in first." };
    const ns = await ownNamespace(db, user.username);
    if (!ns) return { ok: false, error: "Namespace missing." };

    if (!NAME_PATTERN.test(data.name)) return { ok: false, error: "Collection names are lowercase letters, numbers, and hyphens." };
    if (!data.title) return { ok: false, error: "Give the collection a title." };
    if (data.componentNames.length === 0) return { ok: false, error: "Pick at least one component." };

    // Collections share the /r/ namespace with components — refuse collisions.
    const [clash] = await db
      .select({ id: schema.components.id })
      .from(schema.components)
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.components.name, data.name)))
      .limit(1);
    if (clash) return { ok: false, error: `You already have a component named "${data.name}".` };

    // Members must be the creator's own components.
    const own = await db
      .select({ id: schema.components.id, name: schema.components.name })
      .from(schema.components)
      .where(eq(schema.components.namespaceId, ns.id));
    const byName = new Map(own.map((c) => [c.name, c.id]));
    const memberIds = data.componentNames.map((name) => byName.get(name)).filter((id): id is string => Boolean(id));
    if (memberIds.length !== data.componentNames.length) return { ok: false, error: "Collections can only contain your own components." };


    // Upsert by (namespace, name).
    const [existing] = await db
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .where(and(eq(schema.collections.namespaceId, ns.id), eq(schema.collections.name, data.name)))
      .limit(1);
    let collectionId: string;
    if (existing) {
      collectionId = existing.id;
      await db
        .update(schema.collections)
        .set({ title: data.title, description: data.description, updatedAt: new Date() })
        .where(eq(schema.collections.id, collectionId));
      await db.delete(schema.collectionItems).where(eq(schema.collectionItems.collectionId, collectionId));
    } else {
      const [created] = await db
        .insert(schema.collections)
        .values({ namespaceId: ns.id, name: data.name, title: data.title, description: data.description })
        .returning({ id: schema.collections.id });
      collectionId = created!.id;
    }
    for (let i = 0; i < memberIds.length; i++) {
      await db.insert(schema.collectionItems).values({ collectionId, componentId: memberIds[i]!, orderIndex: i });
    }
    return { ok: true };
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .validator((data: { name: string }) => ({ name: String(data.name ?? "").trim().toLowerCase() }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user?.username || !db) return { ok: false, error: "Sign in first." };
    const ns = await ownNamespace(db, user.username);
    if (!ns) return { ok: false, error: "Namespace missing." };
    await db
      .delete(schema.collections)
      .where(and(eq(schema.collections.namespaceId, ns.id), eq(schema.collections.name, data.name)));
    return { ok: true };
  });
