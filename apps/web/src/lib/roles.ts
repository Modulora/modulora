/**
 * Role management — owner-only (OWNER_USER_IDS). The owner can grant/revoke
 * the curator role; ownership itself is env-configured and can never be
 * assigned from the UI (a compromised owner session can't mint new owners).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { desc, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { isOwnerUser } from "./access";

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

export interface Member {
  id: string;
  username: string | null;
  email: string;
  name: string;
  isCurator: boolean;
  isOwner: boolean;
  createdAt: string;
}

export const listMembers = createServerFn({ method: "GET" }).handler(
  async (): Promise<Member[]> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user || !isOwnerUser(user.id)) return [];
    const db = getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        name: schema.users.name,
        isCurator: schema.users.isCurator,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(100);
    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      name: row.name,
      isCurator: row.isCurator ?? false,
      isOwner: isOwnerUser(row.id),
      createdAt: row.createdAt.toISOString(),
    }));
  },
);

export const setCuratorRole = createServerFn({ method: "POST" })
  .validator((data: { userId: string; curator: boolean }) => ({
    userId: String(data.userId),
    curator: Boolean(data.curator),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user || !isOwnerUser(user.id)) return { ok: false, error: "Not authorized." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };
    // The owner's own curator flag stays managed like anyone else's, but
    // revoking your own curator role is allowed — ownership is separate.
    const [target] = await db
      .select({ id: schema.users.id, isCurator: schema.users.isCurator })
      .from(schema.users)
      .where(eq(schema.users.id, data.userId))
      .limit(1);
    if (!target) return { ok: false, error: "User not found." };
    const updated = await db
      .update(schema.users)
      .set({ isCurator: data.curator, updatedAt: new Date() })
      .where(eq(schema.users.id, data.userId))
      .returning({ id: schema.users.id });
    if (updated.length === 0) return { ok: false, error: "User not found." };
    // Append-only audit: who changed which role, from what, to what, when.
    await db.insert(schema.roleChangeEvents).values({
      actorUserId: user.id,
      targetUserId: data.userId,
      role: "curator",
      priorValue: target.isCurator ?? false,
      nextValue: data.curator,
    });
    return { ok: true };
  });
