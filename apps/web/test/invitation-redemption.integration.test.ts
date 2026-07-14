import { afterEach, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, count, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { consumeInvitation, hashInvitationToken } from "../src/lib/invitation-core";

const databaseUrl = process.env.DATABASE_URL;
const db = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null;
const cleanup = new Set<{ userId: string; waitlistId: string; invitationId: string }>();
const extraUsers = new Set<string>();

afterEach(async () => {
  if (!db) return;
  for (const row of cleanup) {
    await db.delete(schema.alphaInvitations).where(eq(schema.alphaInvitations.id, row.invitationId));
    await db.delete(schema.waitlistEntries).where(eq(schema.waitlistEntries.id, row.waitlistId));
    await db.delete(schema.users).where(eq(schema.users.id, row.userId));
  }
  for (const userId of extraUsers) await db.delete(schema.users).where(eq(schema.users.id, userId));
  cleanup.clear();
  extraUsers.clear();
});

describe.skipIf(!databaseUrl)("alpha invitation redemption database contract", () => {
  it("atomically claims the exact namespace once and assigns the badge", async () => {
    const suffix = crypto.randomUUID();
    const userId = `invite-user-${suffix}`;
    const email = `invite-${suffix}@example.com`;
    const username = `invite-${suffix}`.slice(0, 40);
    const token = `token-${crypto.randomUUID()}`;

    await db!.insert(schema.users).values({ id: userId, name: "Invitation Test", email });
    const [waitlist] = await db!.insert(schema.waitlistEntries).values({ email, username }).returning({ id: schema.waitlistEntries.id });
    const [invitation] = await db!.insert(schema.alphaInvitations).values({
      email,
      waitlistEntryId: waitlist.id,
      tokenHash: await hashInvitationToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    }).returning({ id: schema.alphaInvitations.id });
    cleanup.add({ userId, waitlistId: waitlist.id, invitationId: invitation.id });

    const results = await Promise.all([
      consumeInvitation(db!, userId, token),
      consumeInvitation(db!, userId, token),
    ]);
    expect(results.sort()).toEqual([false, true]);

    const [user] = await db!.select({ username: schema.users.username }).from(schema.users).where(eq(schema.users.id, userId));
    const [namespace] = await db!.select({ ownerUserId: schema.namespaces.ownerUserId }).from(schema.namespaces).where(eq(schema.namespaces.name, username));
    const [reservation] = await db!.select({ claimedByUserId: schema.waitlistEntries.claimedByUserId }).from(schema.waitlistEntries).where(eq(schema.waitlistEntries.id, waitlist.id));
    const [badge] = await db!.select({ value: schema.userBadges.badge }).from(schema.userBadges).where(and(eq(schema.userBadges.userId, userId), eq(schema.userBadges.badge, "early-adopter")));
    const [events] = await db!.select({ value: count() }).from(schema.alphaInvitationEvents).where(eq(schema.alphaInvitationEvents.invitationId, invitation.id));
    expect(user.username).toBe(username);
    expect(namespace.ownerUserId).toBe(userId);
    expect(reservation.claimedByUserId).toBe(userId);
    expect(badge.value).toBe("early-adopter");
    expect(events.value).toBe(1);
  });

  it("leaves the invitation and reservation untouched on a namespace conflict", async () => {
    const suffix = crypto.randomUUID();
    const userId = `invite-user-${suffix}`;
    const ownerId = `namespace-owner-${suffix}`;
    const email = `invite-${suffix}@example.com`;
    const username = `conflict-${suffix}`.slice(0, 40);
    const token = `token-${crypto.randomUUID()}`;

    await db!.insert(schema.users).values([
      { id: userId, name: "Invitation Test", email },
      { id: ownerId, name: "Namespace Owner", email: `owner-${suffix}@example.com` },
    ]);
    extraUsers.add(ownerId);
    await db!.insert(schema.namespaces).values({ name: username, ownerUserId: ownerId });
    const [waitlist] = await db!.insert(schema.waitlistEntries).values({ email, username }).returning({ id: schema.waitlistEntries.id });
    const [invitation] = await db!.insert(schema.alphaInvitations).values({
      email,
      waitlistEntryId: waitlist.id,
      tokenHash: await hashInvitationToken(token),
      expiresAt: new Date(Date.now() + 60_000),
    }).returning({ id: schema.alphaInvitations.id });
    cleanup.add({ userId, waitlistId: waitlist.id, invitationId: invitation.id });

    expect(await consumeInvitation(db!, userId, token)).toBe(false);
    const [storedInvitation] = await db!.select({ acceptedAt: schema.alphaInvitations.acceptedAt }).from(schema.alphaInvitations).where(eq(schema.alphaInvitations.id, invitation.id));
    const [reservation] = await db!.select({ claimedByUserId: schema.waitlistEntries.claimedByUserId }).from(schema.waitlistEntries).where(eq(schema.waitlistEntries.id, waitlist.id));
    expect(storedInvitation.acceptedAt).toBeNull();
    expect(reservation.claimedByUserId).toBeNull();
  });
});
