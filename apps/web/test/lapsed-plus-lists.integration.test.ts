import { afterEach, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { publicListsFor } from "../src/lib/lists";

const databaseUrl = process.env.DATABASE_URL;
const db = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null;
const cleanup = new Set<{ userId: string; namespaceId: string }>();

afterEach(async () => {
  if (!db) return;
  for (const row of cleanup) {
    await db.delete(schema.namespaces).where(eq(schema.namespaces.id, row.namespaceId));
    await db.delete(schema.users).where(eq(schema.users.id, row.userId));
  }
  cleanup.clear();
});

describe.skipIf(!databaseUrl)("lapsed Plus public-list policy", () => {
  it("keeps an already-public list visible without an active subscription", async () => {
    const suffix = crypto.randomUUID();
    const userId = `lapsed-${suffix}`;
    await db!.insert(schema.users).values({
      id: userId,
      name: "Lapsed Plus Contract",
      email: `${userId}@example.com`,
      stripeSubscriptionStatus: "canceled",
    });
    const [namespace] = await db!.insert(schema.namespaces).values({ name: `lapsed-${suffix}`.slice(0, 40), ownerUserId: userId }).returning({ id: schema.namespaces.id });
    const [component] = await db!.insert(schema.components).values({
      namespaceId: namespace.id,
      name: "public-list-probe",
      title: "Public List Probe",
      description: "Lapsed Plus list policy",
      category: "other",
      framework: "react",
      sourceModel: "open-source",
      reviewStatus: "approved",
      visibility: "public",
    }).returning({ id: schema.components.id });
    const [publicList] = await db!.insert(schema.lists).values({ userId, name: "kept-public", title: "Kept public", visibility: "public" }).returning({ id: schema.lists.id });
    const [privateList] = await db!.insert(schema.lists).values({ userId, name: "stays-private", title: "Stays private", visibility: "private" }).returning({ id: schema.lists.id });
    await db!.insert(schema.listItems).values([
      { listId: publicList.id, componentId: component.id },
      { listId: privateList.id, componentId: component.id },
    ]);
    cleanup.add({ userId, namespaceId: namespace.id });

    await expect(publicListsFor(userId)).resolves.toEqual([
      {
        name: "kept-public",
        title: "Kept public",
        items: [{ namespace: `lapsed-${suffix}`.slice(0, 40), name: "public-list-probe", title: "Public List Probe" }],
      },
    ]);
  });
});
