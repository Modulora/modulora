import { sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { schema } from "@modulora/db";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
type Db = NeonHttpDatabase<typeof schema>;

export interface ReporterContactToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export async function hashReporterContactToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createReporterContactToken(now = new Date()): Promise<ReporterContactToken> {
  const token = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  return {
    token,
    tokenHash: await hashReporterContactToken(token),
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
  };
}

export function reporterContactTokenIsValid(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

export async function consumeReporterContactToken(
  db: Db,
  token: string,
  now = new Date(),
): Promise<boolean> {
  if (!reporterContactTokenIsValid(token)) return false;
  const tokenHash = await hashReporterContactToken(token);

  // neon-http has no interactive transactions. A data-modifying CTE makes
  // token consumption, credential clearing, and the append-only audit event
  // one atomic PostgreSQL statement.
  const result = await db.execute<{ caseId: string }>(sql`
    with verified as (
      update moderation_cases
      set reporter_contact_verified_at = ${now},
          reporter_contact_token_hash = null,
          reporter_contact_token_expires_at = null,
          updated_at = ${now}
      where reporter_contact_token_hash = ${tokenHash}
        and reporter_contact_token_expires_at > ${now}
        and reporter_contact_verified_at is null
      returning id
    )
    insert into moderation_case_events (case_id, action, actor_user_id, note)
    select id, 'reporter_contact_verified', null,
      'Reporter confirmed the case-specific contact address.'
    from verified
    returning case_id as "caseId"
  `);
  return result.rows.length === 1;
}
