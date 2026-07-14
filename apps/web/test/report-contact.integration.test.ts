import { afterEach, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { count, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { consumeReporterContactToken, createReporterContactToken } from "../src/lib/report-contact";

const databaseUrl = process.env.DATABASE_URL;
const db = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null;
const cleanup = new Set<string>();

afterEach(async () => {
  if (!db) return;
  for (const caseId of cleanup) {
    await db.delete(schema.moderationCases).where(eq(schema.moderationCases.id, caseId));
  }
  cleanup.clear();
});

describe.skipIf(!databaseUrl)("reporter contact verification database contract", () => {
  it("atomically confirms once, clears credentials, and appends one event", async () => {
    const contact = await createReporterContactToken();
    const [moderationCase] = await db!.insert(schema.moderationCases).values({
      componentRef: "@integration/contact-confirmation",
      reason: "other",
      details: "Integration contract test",
      reporterEmail: "reporter-contact@example.com",
      reporterContactTokenHash: contact.tokenHash,
      reporterContactTokenExpiresAt: contact.expiresAt,
    }).returning({ id: schema.moderationCases.id });
    cleanup.add(moderationCase.id);

    expect(await consumeReporterContactToken(db!, contact.token)).toBe(true);
    expect(await consumeReporterContactToken(db!, contact.token)).toBe(false);

    const [persisted] = await db!
      .select({
        verifiedAt: schema.moderationCases.reporterContactVerifiedAt,
        tokenHash: schema.moderationCases.reporterContactTokenHash,
        expiresAt: schema.moderationCases.reporterContactTokenExpiresAt,
      })
      .from(schema.moderationCases)
      .where(eq(schema.moderationCases.id, moderationCase.id));
    const [events] = await db!
      .select({ value: count() })
      .from(schema.moderationCaseEvents)
      .where(eq(schema.moderationCaseEvents.caseId, moderationCase.id));

    expect(persisted.verifiedAt).toBeInstanceOf(Date);
    expect(persisted.tokenHash).toBeNull();
    expect(persisted.expiresAt).toBeNull();
    expect(events.value).toBe(1);
  });

  it("does not consume an expired token or append an event", async () => {
    const oldNow = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const contact = await createReporterContactToken(oldNow);
    const [moderationCase] = await db!.insert(schema.moderationCases).values({
      componentRef: "@integration/expired-contact",
      reason: "other",
      details: "Expired integration contract test",
      reporterEmail: "expired-contact@example.com",
      reporterContactTokenHash: contact.tokenHash,
      reporterContactTokenExpiresAt: contact.expiresAt,
    }).returning({ id: schema.moderationCases.id });
    cleanup.add(moderationCase.id);

    expect(await consumeReporterContactToken(db!, contact.token)).toBe(false);
    const [events] = await db!
      .select({ value: count() })
      .from(schema.moderationCaseEvents)
      .where(eq(schema.moderationCaseEvents.caseId, moderationCase.id));
    expect(events.value).toBe(0);
  });
});
