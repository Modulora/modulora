/**
 * Role management — owner-only (OWNER_USER_IDS). The owner can grant/revoke
 * the curator role; ownership itself is env-configured and can never be
 * assigned from the UI (a compromised owner session can't mint new owners).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { and, desc, eq, ilike, inArray, notInArray, or, sql, type SQL } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { isOwnerUser } from "./access";

type Db = NeonHttpDatabase<typeof schema>;

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

export const searchMembers = createServerFn({ method: "GET" })
  .validator((data: { query: string; role: string }) => ({
    query: String(data.query ?? "").trim().slice(0, 100),
    role: ["all", "curators", "members", "owners"].includes(data.role) ? data.role : "all",
  }))
  .handler(async ({ data }): Promise<Member[]> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user || !isOwnerUser(user.id)) return [];
    const db = getDb();
    if (!db) return [];
    const ownerIds = (process.env.OWNER_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
    if (data.role === "owners" && ownerIds.length === 0) return [];
    const filters: SQL[] = [];
    if (data.query) {
      const pattern = `%${data.query}%`;
      const search = or(
        ilike(schema.users.username, pattern),
        ilike(schema.users.name, pattern),
        ilike(schema.users.email, pattern),
      );
      if (search) filters.push(search);
    }
    if (data.role === "curators") filters.push(eq(schema.users.isCurator, true));
    if (data.role === "owners") filters.push(inArray(schema.users.id, ownerIds));
    if (data.role === "members") {
      filters.push(eq(schema.users.isCurator, false));
      if (ownerIds.length > 0) filters.push(notInArray(schema.users.id, ownerIds));
    }
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
      .where(filters.length > 0 ? and(...filters) : undefined)
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
  });

export async function setCuratorRoleCore(
  db: Db,
  actor: { id: string; isOwner: boolean } | null,
  data: { userId: string; curator: boolean },
  now = new Date(),
): Promise<{ ok: boolean; error?: string }> {
  if (!actor?.isOwner) return { ok: false, error: "Not authorized." };
  if (!data.userId) return { ok: false, error: "User not found." };
  const result = await db.execute<{ id: string }>(sql`
    with candidate as materialized (
      select id, coalesce(is_curator, false) as prior_value
      from "user"
      where id = ${data.userId}
        and coalesce(is_curator, false) is distinct from ${data.curator}
      for update
    ), updated as (
      update "user" as u
      set is_curator = ${data.curator}, updated_at = ${now}
      from candidate
      where u.id = candidate.id
      returning u.id, candidate.prior_value
    ), recorded as (
      insert into role_change_events (
        actor_user_id, target_user_id, role, prior_value, next_value
      )
      select ${actor.id}, id, 'curator', prior_value, ${data.curator}
      from updated
      returning target_user_id
    )
    select updated.id
    from updated
    inner join recorded on recorded.target_user_id = updated.id
  `);
  if (result.rows.length !== 1) return { ok: false, error: "User not found or role already set." };
  return { ok: true };
}

export const setCuratorRole = createServerFn({ method: "POST" })
  .validator((data: { userId: string; curator: boolean }) => ({
    userId: String(data.userId),
    curator: Boolean(data.curator),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };
    return setCuratorRoleCore(
      db,
      user ? { id: user.id, isOwner: isOwnerUser(user.id) } : null,
      data,
    );
  });
