/**
 * Component lists (Plus): named groups of anyone's components, public or
 * private. Curation-as-content: a public list renders on the curator's
 * profile, clearly "curated by X" — never affecting the builders' earnings
 * or rank (the honesty rule).
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

export interface MyList {
  id: string;
  name: string;
  title: string;
  visibility: "public" | "private";
  items: { namespace: string; name: string; title: string }[];
}

export const fetchMyLists = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ plus: boolean; lists: MyList[] }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user || !db) return { plus: false, lists: [] };
    if (!user.isPlus) return { plus: false, lists: [] };

    const rows = await db.select().from(schema.lists).where(eq(schema.lists.userId, user.id)).orderBy(desc(schema.lists.updatedAt));
    const lists: MyList[] = [];
    for (const list of rows) {
      const items = await db
        .select({ namespace: schema.namespaces.name, name: schema.components.name, title: schema.components.title })
        .from(schema.listItems)
        .innerJoin(schema.components, eq(schema.components.id, schema.listItems.componentId))
        .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
        .where(eq(schema.listItems.listId, list.id))
        .orderBy(asc(schema.listItems.createdAt));
      lists.push({ id: list.id, name: list.name, title: list.title, visibility: list.visibility, items });
    }
    return { plus: true, lists };
  },
);

export const createList = createServerFn({ method: "POST" })
  .validator((data: { title: string; visibility: string }) => ({
    title: String(data.title ?? "").trim().slice(0, 80),
    visibility: data.visibility === "public" ? ("public" as const) : ("private" as const),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user || !db) return { ok: false, error: "Sign in first." };
    if (!user.isPlus) return { ok: false, error: "Lists are part of Modulora Plus." };
    if (!data.title) return { ok: false, error: "Give the list a title." };
    const name = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    if (!NAME_PATTERN.test(name)) return { ok: false, error: "Pick a title with some letters or numbers." };
    const [clash] = await db
      .select({ id: schema.lists.id })
      .from(schema.lists)
      .where(and(eq(schema.lists.userId, user.id), eq(schema.lists.name, name)))
      .limit(1);
    if (clash) return { ok: false, error: "You already have a list with that name." };
    await db.insert(schema.lists).values({ userId: user.id, name, title: data.title, visibility: data.visibility });
    return { ok: true };
  });

export const toggleListItem = createServerFn({ method: "POST" })
  .validator((data: { listId: string; namespace: string; name: string }) => ({
    listId: String(data.listId ?? ""),
    namespace: String(data.namespace ?? "").trim().toLowerCase(),
    name: String(data.name ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; inList?: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user || !db) return { ok: false, error: "Sign in first." };
    if (!user.isPlus) return { ok: false, error: "Lists are part of Modulora Plus." };

    const [list] = await db
      .select({ id: schema.lists.id })
      .from(schema.lists)
      .where(and(eq(schema.lists.id, data.listId), eq(schema.lists.userId, user.id)))
      .limit(1);
    if (!list) return { ok: false, error: "List not found." };

    const [component] = await db
      .select({ id: schema.components.id })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(and(eq(schema.namespaces.name, data.namespace), eq(schema.components.name, data.name)))
      .limit(1);
    if (!component) return { ok: false, error: "Component not found." };

    const [existing] = await db
      .select({ id: schema.listItems.id })
      .from(schema.listItems)
      .where(and(eq(schema.listItems.listId, list.id), eq(schema.listItems.componentId, component.id)))
      .limit(1);
    if (existing) {
      await db.delete(schema.listItems).where(eq(schema.listItems.id, existing.id));
      return { ok: true, inList: false };
    }
    await db.insert(schema.listItems).values({ listId: list.id, componentId: component.id });
    await db.update(schema.lists).set({ updatedAt: new Date() }).where(eq(schema.lists.id, list.id));
    return { ok: true, inList: true };
  });

export const deleteList = createServerFn({ method: "POST" })
  .validator((data: { listId: string }) => ({ listId: String(data.listId ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user || !db) return { ok: false };
    await db.delete(schema.lists).where(and(eq(schema.lists.id, data.listId), eq(schema.lists.userId, user.id)));
    return { ok: true };
  });

/** Public lists for a profile: "curated by X", builders unaffected. */
export interface PublicList {
  name: string;
  title: string;
  items: { namespace: string; name: string; title: string }[];
}

export async function publicListsFor(userId: string): Promise<PublicList[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(schema.lists)
    .where(and(eq(schema.lists.userId, userId), eq(schema.lists.visibility, "public")))
    .orderBy(desc(schema.lists.updatedAt));
  const out: PublicList[] = [];
  for (const list of rows) {
    const items = await db
      .select({ namespace: schema.namespaces.name, name: schema.components.name, title: schema.components.title })
      .from(schema.listItems)
      .innerJoin(schema.components, eq(schema.components.id, schema.listItems.componentId))
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(and(eq(schema.listItems.listId, list.id), eq(schema.components.visibility, "public"), eq(schema.components.reviewStatus, "approved")))
      .orderBy(asc(schema.listItems.createdAt));
    if (items.length > 0) out.push({ name: list.name, title: list.title, items });
  }
  return out;
}
