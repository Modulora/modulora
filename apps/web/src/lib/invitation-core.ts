import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { schema } from "@modulora/db";

type Db = ReturnType<typeof drizzle<typeof schema>>;

export const ALPHA_INVITATION_COOKIE = "modulora_alpha_invite";
export const ALPHA_INVITATION_TTL_DAYS = 7;
export const EARLY_ADOPTER_BADGE = "early-adopter";
const TOKEN_BYTES = 32;

export type InvitationState = "pending" | "accepted" | "revoked" | "expired";

export function userCreationRequiresInvitation(gateActive: boolean, allowlisted: boolean): boolean {
  return gateActive && !allowlisted;
}

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function classifyInvitation(row: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}, now = new Date()): InvitationState {
  if (row.revokedAt) return "revoked";
  if (row.acceptedAt) return "accepted";
  if (row.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

export function generateInvitationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function hashInvitationToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function invitationTokenFromRequest(request: Request | undefined | null): string | null {
  const cookie = request?.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === ALPHA_INVITATION_COOKIE) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function invitationCookie(token: string, expiresAt: Date, secure: boolean): string {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return [
    `${ALPHA_INVITATION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/api/auth",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : null,
    `Max-Age=${maxAge}`,
  ].filter(Boolean).join("; ");
}

export function clearInvitationCookie(secure: boolean): string {
  return [
    `${ALPHA_INVITATION_COOKIE}=`,
    "Path=/api/auth",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : null,
    "Max-Age=0",
  ].filter(Boolean).join("; ");
}

export async function invitationForToken(db: Db, token: string) {
  if (!token || token.length > 256) return null;
  const tokenHash = await hashInvitationToken(token);
  const [row] = await db
    .select()
    .from(schema.alphaInvitations)
    .where(eq(schema.alphaInvitations.tokenHash, tokenHash))
    .limit(1);
  return row ?? null;
}

/**
 * Possession of the emailed single-use token is the redemption proof; the
 * account may finish with a provider whose email differs from the invited
 * address, so lookups match by token hash alone.
 */
export async function activeInvitationFor(db: Db, token: string) {
  const tokenHash = await hashInvitationToken(token);
  const [row] = await db
    .select()
    .from(schema.alphaInvitations)
    .where(
      and(
        eq(schema.alphaInvitations.tokenHash, tokenHash),
        isNull(schema.alphaInvitations.acceptedAt),
        isNull(schema.alphaInvitations.revokedAt),
        gt(schema.alphaInvitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function invitationAcceptedBy(db: Db, userId: string, token: string): Promise<boolean> {
  const tokenHash = await hashInvitationToken(token);
  const [row] = await db
    .select({ id: schema.alphaInvitations.id })
    .from(schema.alphaInvitations)
    .where(
      and(
        eq(schema.alphaInvitations.tokenHash, tokenHash),
        eq(schema.alphaInvitations.acceptedByUserId, userId),
        isNull(schema.alphaInvitations.revokedAt),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function consumeInvitation(db: Db, userId: string, token: string): Promise<boolean> {
  const tokenHash = await hashInvitationToken(token);
  const acceptedAt = new Date();
  try {
    // neon-http does not expose interactive transactions. A single
    // data-modifying CTE keeps invitation consumption, exact namespace claim,
    // waitlist claim, access grant, lifecycle event, and badge assignment
    // atomic in PostgreSQL.
    const result = await db.execute<{ id: string }>(sql`
      with candidate as materialized (
        select
          ai.id as invitation_id,
          ai.waitlist_entry_id,
          we.username
        from alpha_invitations ai
        join waitlist_entries we on we.id = ai.waitlist_entry_id
        where ai.token_hash = ${tokenHash}
          and ai.accepted_at is null
          and ai.revoked_at is null
          and ai.expires_at > ${acceptedAt}
          and (we.claimed_by_user_id is null or we.claimed_by_user_id = ${userId})
          and not exists (
            select 1 from namespaces n
            where n.name = we.username
              and n.owner_user_id is distinct from ${userId}
          )
        limit 1
        for update of ai
      ),
      namespace_insert as (
        insert into namespaces (name, owner_user_id)
        select username, ${userId} from candidate
        on conflict (name) do nothing
        returning name
      ),
      namespace_ready as (
        select c.*
        from candidate c
        where exists (
          select 1 from namespaces n
          where n.name = c.username and n.owner_user_id = ${userId}
        ) or exists (
          select 1 from namespace_insert ni where ni.name = c.username
        )
      ),
      waitlist_claim as (
        update waitlist_entries we
        set claimed_by_user_id = ${userId}, claimed_at = ${acceptedAt}
        from namespace_ready nr
        where we.id = nr.waitlist_entry_id
          and (we.claimed_by_user_id is null or we.claimed_by_user_id = ${userId})
        returning nr.invitation_id, nr.username
      ),
      user_update as (
        update "user" u
        set username = wc.username, updated_at = ${acceptedAt}
        from waitlist_claim wc
        where u.id = ${userId}
        returning wc.invitation_id
      ),
      invitation_update as (
        update alpha_invitations ai
        set accepted_at = ${acceptedAt}, accepted_by_user_id = ${userId}, updated_at = ${acceptedAt}
        from user_update uu
        where ai.id = uu.invitation_id and ai.accepted_at is null
        returning ai.id
      ),
      event_insert as (
        insert into alpha_invitation_events (invitation_id, action, actor_user_id)
        select id, 'accepted', ${userId} from invitation_update
        returning id
      ),
      badge_insert as (
        insert into user_badges (user_id, badge, source)
        select ${userId}, ${EARLY_ADOPTER_BADGE}, 'alpha-invitation'
        from invitation_update
        on conflict (user_id, badge) do nothing
        returning id
      )
      select iu.id
      from invitation_update iu
      where exists (select 1 from event_insert)
        and (exists (select 1 from badge_insert) or exists (
          select 1 from user_badges ub
          where ub.user_id = ${userId} and ub.badge = ${EARLY_ADOPTER_BADGE}
        ))
    `);
    return result.rows.length === 1;
  } catch (error) {
    console.error("invitation redemption failed", error);
    return false;
  }
}

export async function hasAcceptedInvitation(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.alphaInvitations.id })
    .from(schema.alphaInvitations)
    .where(
      and(
        eq(schema.alphaInvitations.acceptedByUserId, userId),
        isNull(schema.alphaInvitations.revokedAt),
      ),
    )
    .limit(1);
  return Boolean(row);
}
