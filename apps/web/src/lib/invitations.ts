import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, count, desc, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { schema } from "@modulora/db";
import { isOwnerUser } from "./access";
import { emailAlphaInvitation } from "./email";
import {
  ALPHA_INVITATION_TTL_DAYS,
  classifyInvitation,
  generateInvitationToken,
  hashInvitationToken,
  invitationForToken,
  type InvitationState,
} from "./invitation-core";
import { getCurrentUser } from "./session";

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

function expiresAt() {
  return new Date(Date.now() + ALPHA_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export interface AlphaWaitlistCandidate {
  waitlistEntryId: string;
  email: string;
  username: string;
  joinedAt: string;
  claimedByUserId: string | null;
  invitation: {
    id: string;
    state: InvitationState;
    invitedByUserId: string | null;
    acceptedByUserId: string | null;
    sentAt: string;
    expiresAt: string;
    sendCount: number;
  } | null;
}

export interface AlphaWaitlistPage {
  items: AlphaWaitlistCandidate[];
  total: number;
  page: number;
  pageSize: number;
}

export const listAlphaWaitlistCandidates = createServerFn({ method: "GET" })
  .validator((data: { page?: number; pageSize?: number }) => ({
    page: Math.max(0, Math.floor(Number(data.page) || 0)),
    pageSize: Math.min(50, Math.max(10, Math.floor(Number(data.pageSize) || 10))),
  }))
  .handler(
  async ({ data }): Promise<AlphaWaitlistPage> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user || !isOwnerUser(user.id)) return { items: [], total: 0, page: data.page, pageSize: data.pageSize };
    const db = getDb();
    if (!db) return { items: [], total: 0, page: data.page, pageSize: data.pageSize };
    const [totalRow] = await db.select({ value: count() }).from(schema.waitlistEntries);
    const total = totalRow?.value ?? 0;
    const lastPage = Math.max(0, Math.ceil(total / data.pageSize) - 1);
    const page = Math.min(data.page, lastPage);
    const reservations = await db
      .select()
      .from(schema.waitlistEntries)
      .orderBy(desc(schema.waitlistEntries.createdAt))
      .limit(data.pageSize)
      .offset(page * data.pageSize);
    const waitlistIds = reservations.map((reservation) => reservation.id);
    const invitations = waitlistIds.length > 0
      ? await db
          .select()
          .from(schema.alphaInvitations)
          .where(inArray(schema.alphaInvitations.waitlistEntryId, waitlistIds))
          .orderBy(desc(schema.alphaInvitations.createdAt))
      : [];
    const latestByWaitlist = new Map<string, (typeof invitations)[number]>();
    for (const invitation of invitations) {
      if (!latestByWaitlist.has(invitation.waitlistEntryId)) latestByWaitlist.set(invitation.waitlistEntryId, invitation);
    }
    const items = reservations.map((reservation) => {
      const invitation = latestByWaitlist.get(reservation.id);
      return {
        waitlistEntryId: reservation.id,
        email: reservation.email,
        username: reservation.username,
        joinedAt: reservation.createdAt.toISOString(),
        claimedByUserId: reservation.claimedByUserId,
        invitation: invitation ? {
          id: invitation.id,
          state: classifyInvitation(invitation),
          invitedByUserId: invitation.invitedByUserId,
          acceptedByUserId: invitation.acceptedByUserId,
          sentAt: invitation.sentAt.toISOString(),
          expiresAt: invitation.expiresAt.toISOString(),
          sendCount: invitation.sendCount,
        } : null,
      };
    });
    return { items, total, page, pageSize: data.pageSize };
  },
);

export const inviteAlphaUser = createServerFn({ method: "POST" })
  .validator((data: { waitlistEntryId: string }) => ({ waitlistEntryId: String(data.waitlistEntryId ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const actor = request ? await getCurrentUser(request) : null;
    if (!actor || !isOwnerUser(actor.id)) return { ok: false, error: "Not authorized." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    const [reservation] = await db
      .select()
      .from(schema.waitlistEntries)
      .where(eq(schema.waitlistEntries.id, data.waitlistEntryId))
      .limit(1);
    if (!reservation) return { ok: false, error: "Waitlist reservation not found." };

    const [existingAccess] = await db
      .select({ id: schema.alphaInvitations.id })
      .from(schema.alphaInvitations)
      .where(
        and(
          eq(schema.alphaInvitations.waitlistEntryId, reservation.id),
          isNotNull(schema.alphaInvitations.acceptedAt),
          isNull(schema.alphaInvitations.revokedAt),
        ),
      )
      .limit(1);
    if (existingAccess) return { ok: false, error: "This waitlist member already has alpha access." };

    const [namespace] = await db
      .select({ ownerUserId: schema.namespaces.ownerUserId })
      .from(schema.namespaces)
      .where(eq(schema.namespaces.name, reservation.username))
      .limit(1);
    if (namespace && namespace.ownerUserId !== reservation.claimedByUserId) {
      return { ok: false, error: "The reserved username is owned by another account. Resolve it before inviting." };
    }

    const now = new Date();
    await db
      .update(schema.alphaInvitations)
      .set({ revokedAt: now, revokedByUserId: actor.id, updatedAt: now })
      .where(
        and(
          eq(schema.alphaInvitations.waitlistEntryId, reservation.id),
          isNull(schema.alphaInvitations.acceptedAt),
          isNull(schema.alphaInvitations.revokedAt),
          lte(schema.alphaInvitations.expiresAt, now),
        ),
      );

    const [active] = await db
      .select({ id: schema.alphaInvitations.id })
      .from(schema.alphaInvitations)
      .where(
        and(
          eq(schema.alphaInvitations.waitlistEntryId, reservation.id),
          isNull(schema.alphaInvitations.acceptedAt),
          isNull(schema.alphaInvitations.revokedAt),
        ),
      )
      .limit(1);
    if (active) return { ok: false, error: "A pending invitation already exists. Resend or revoke it." };

    const token = generateInvitationToken();
    const expiry = expiresAt();
    const [invitation] = await db
      .insert(schema.alphaInvitations)
      .values({
        email: reservation.email,
        waitlistEntryId: reservation.id,
        tokenHash: await hashInvitationToken(token),
        invitedByUserId: actor.id,
        expiresAt: expiry,
      })
      .returning({ id: schema.alphaInvitations.id });
    if (!invitation) return { ok: false, error: "Could not create the invitation." };
    await db.insert(schema.alphaInvitationEvents).values({
      invitationId: invitation.id,
      action: "issued",
      actorUserId: actor.id,
    });
    await emailAlphaInvitation(reservation.email, reservation.username, token, expiry);
    return { ok: true };
  });

export const resendAlphaInvitation = createServerFn({ method: "POST" })
  .validator((data: { invitationId: string }) => ({ invitationId: String(data.invitationId ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const actor = request ? await getCurrentUser(request) : null;
    if (!actor || !isOwnerUser(actor.id)) return { ok: false, error: "Not authorized." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };
    const [row] = await db
      .select({ invitation: schema.alphaInvitations, username: schema.waitlistEntries.username })
      .from(schema.alphaInvitations)
      .innerJoin(schema.waitlistEntries, eq(schema.waitlistEntries.id, schema.alphaInvitations.waitlistEntryId))
      .where(eq(schema.alphaInvitations.id, data.invitationId))
      .limit(1);
    if (!row || row.invitation.acceptedAt || row.invitation.revokedAt) {
      return { ok: false, error: "Only pending invitations can be resent." };
    }
    const token = generateInvitationToken();
    const expiry = expiresAt();
    const sentAt = new Date();
    const updated = await db
      .update(schema.alphaInvitations)
      .set({
        tokenHash: await hashInvitationToken(token),
        expiresAt: expiry,
        sentAt,
        sendCount: sql`${schema.alphaInvitations.sendCount} + 1`,
        updatedAt: sentAt,
      })
      .where(
        and(
          eq(schema.alphaInvitations.id, row.invitation.id),
          eq(schema.alphaInvitations.tokenHash, row.invitation.tokenHash),
          isNull(schema.alphaInvitations.acceptedAt),
          isNull(schema.alphaInvitations.revokedAt),
        ),
      )
      .returning({ id: schema.alphaInvitations.id });
    if (!updated[0]) return { ok: false, error: "The invitation changed while resending. Refresh and try again." };
    await db.insert(schema.alphaInvitationEvents).values({
      invitationId: row.invitation.id,
      action: "resent",
      actorUserId: actor.id,
    });
    await emailAlphaInvitation(row.invitation.email, row.username, token, expiry);
    return { ok: true };
  });

export const revokeAlphaInvitation = createServerFn({ method: "POST" })
  .validator((data: { invitationId: string }) => ({ invitationId: String(data.invitationId ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const actor = request ? await getCurrentUser(request) : null;
    if (!actor || !isOwnerUser(actor.id)) return { ok: false, error: "Not authorized." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };
    const now = new Date();
    const rows = await db
      .update(schema.alphaInvitations)
      .set({ revokedAt: now, revokedByUserId: actor.id, updatedAt: now })
      .where(and(eq(schema.alphaInvitations.id, data.invitationId), isNull(schema.alphaInvitations.revokedAt)))
      .returning({ id: schema.alphaInvitations.id });
    if (!rows[0]) return { ok: false, error: "Invitation not found or already revoked." };
    await db.insert(schema.alphaInvitationEvents).values({
      invitationId: rows[0].id,
      action: "revoked",
      actorUserId: actor.id,
    });
    return { ok: true };
  });

export interface InvitationSetup {
  state: InvitationState | "invalid";
  email?: string;
  username?: string;
  accountExists?: boolean;
  hasCredential?: boolean;
  expiresAt?: string;
}

export const inspectAlphaInvitation = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => ({ token: String(data.token ?? "") }))
  .handler(async ({ data }): Promise<InvitationSetup> => {
    const db = getDb();
    if (!db) return { state: "invalid" };
    const invitation = await invitationForToken(db, data.token);
    if (!invitation) return { state: "invalid" };
    const state = classifyInvitation(invitation);
    if (state !== "pending") return { state };
    const [reservation] = await db
      .select({ username: schema.waitlistEntries.username })
      .from(schema.waitlistEntries)
      .where(eq(schema.waitlistEntries.id, invitation.waitlistEntryId))
      .limit(1);
    const [user] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, invitation.email))
      .limit(1);
    const [credential] = user
      ? await db
          .select({ id: schema.accounts.id })
          .from(schema.accounts)
          .where(and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, "credential"), isNotNull(schema.accounts.password)))
          .limit(1)
      : [];
    return {
      state,
      email: invitation.email,
      username: reservation?.username,
      accountExists: Boolean(user),
      hasCredential: Boolean(credential),
      expiresAt: invitation.expiresAt.toISOString(),
    };
  });
