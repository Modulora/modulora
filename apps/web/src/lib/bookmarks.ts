/**
 * Bookmarks (Plus) — quick-save any component. Personal only; bookmarking
 * never affects earnings, ranking, or curation (the honesty rule). Named
 * public/private lists live in lib/lists.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

async function componentIdOf(db: NonNullable<ReturnType<typeof getDb>>, namespace: string, name: string) {
  const [row] = await db
    .select({ id: schema.components.id })
    .from(schema.components)
    .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
    .where(and(eq(schema.namespaces.name, namespace), eq(schema.components.name, name)))
    .limit(1);
  return row?.id ?? null;
}

export const toggleBookmark = createServerFn({ method: "POST" })
  .validator((data: { namespace: string; name: string }) => ({
    namespace: String(data.namespace ?? "").trim().toLowerCase(),
    name: String(data.name ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; bookmarked?: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user || !db) return { ok: false, error: "Sign in first." };
    if (!user.isPlus) return { ok: false, error: "Bookmarks are part of Modulora Plus." };
    const componentId = await componentIdOf(db, data.namespace, data.name);
    if (!componentId) return { ok: false, error: "Component not found." };

    const [existing] = await db
      .select({ id: schema.bookmarks.id })
      .from(schema.bookmarks)
      .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.componentId, componentId)))
      .limit(1);
    if (existing) {
      await db.delete(schema.bookmarks).where(eq(schema.bookmarks.id, existing.id));
      return { ok: true, bookmarked: false };
    }
    await db.insert(schema.bookmarks).values({ userId: user.id, componentId });
    return { ok: true, bookmarked: true };
  });

export const isBookmarked = createServerFn({ method: "GET" })
  .validator((data: { namespace: string; name: string }) => ({
    namespace: String(data.namespace ?? "").trim().toLowerCase(),
    name: String(data.name ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }): Promise<boolean> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user?.isPlus || !db) return false;
    const componentId = await componentIdOf(db, data.namespace, data.name);
    if (!componentId) return false;
    const [row] = await db
      .select({ id: schema.bookmarks.id })
      .from(schema.bookmarks)
      .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.componentId, componentId)))
      .limit(1);
    return Boolean(row);
  });

export interface BookmarkedComponent {
  namespace: string;
  name: string;
  title: string;
  description: string;
  createdAt: string;
}

export const fetchMyBookmarks = createServerFn({ method: "GET" }).handler(
  async (): Promise<BookmarkedComponent[]> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user?.isPlus || !db) return [];
    const rows = await db
      .select({
        namespace: schema.namespaces.name,
        name: schema.components.name,
        title: schema.components.title,
        description: schema.components.description,
        createdAt: schema.bookmarks.createdAt,
      })
      .from(schema.bookmarks)
      .innerJoin(schema.components, eq(schema.components.id, schema.bookmarks.componentId))
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(eq(schema.bookmarks.userId, user.id))
      .orderBy(desc(schema.bookmarks.createdAt));
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  },
);
