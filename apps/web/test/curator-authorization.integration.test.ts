import { afterEach, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { count, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { decideReviewCore } from "../src/lib/review";
import { setCuratorRoleCore } from "../src/lib/roles";
import { REVIEW_CHECKS, type Checklist } from "../src/lib/review-standard";

const databaseUrl = process.env.DATABASE_URL;
const db = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null;
const cleanup = new Set<{ ownerId: string; reviewerId: string; namespaceId: string }>();

const checklist = Object.fromEntries(
  REVIEW_CHECKS.map((check) => [check.id, "pass"]),
) as Checklist;

afterEach(async () => {
  if (!db) return;
  for (const row of cleanup) {
    await db.delete(schema.namespaces).where(eq(schema.namespaces.id, row.namespaceId));
    await db.delete(schema.roleChangeEvents).where(eq(schema.roleChangeEvents.actorUserId, row.ownerId));
    await db.delete(schema.users).where(eq(schema.users.id, row.reviewerId));
    await db.delete(schema.users).where(eq(schema.users.id, row.ownerId));
  }
  cleanup.clear();
});

async function fixture() {
  const suffix = crypto.randomUUID();
  const ownerId = `owner-${suffix}`;
  const reviewerId = `reviewer-${suffix}`;
  await db!.insert(schema.users).values([
    { id: ownerId, name: "Owner Contract", email: `${ownerId}@example.com` },
    { id: reviewerId, name: "Reviewer Contract", email: `${reviewerId}@example.com`, isCurator: true },
  ]);
  const [namespace] = await db!.insert(schema.namespaces).values({ name: `contract-${suffix}`.slice(0, 40), ownerUserId: ownerId }).returning({ id: schema.namespaces.id });
  const [component] = await db!.insert(schema.components).values({
    namespaceId: namespace.id,
    name: "authorization-probe",
    title: "Authorization Probe",
    description: "Direct decision contract",
    category: "other",
    framework: "react",
    sourceModel: "open-source",
    reviewStatus: "pending",
  }).returning({ id: schema.components.id });
  cleanup.add({ ownerId, reviewerId, namespaceId: namespace.id });
  return { ownerId, reviewerId, componentId: component.id };
}

describe.skipIf(!databaseUrl)("curator direct-call authorization and record contracts", () => {
  it("rejects direct review bypass and permits only one concurrent decision", async () => {
    const row = await fixture();
    const input = { componentId: row.componentId, decision: "approve" as const, rationale: "All alpha-1 checks passed for this release.", checklist };

    await expect(decideReviewCore(db!, { id: row.ownerId, isCurator: false }, input)).resolves.toEqual({ ok: false, error: "Curators only." });
    const concurrent = await Promise.all([
      decideReviewCore(db!, { id: row.reviewerId, isCurator: true }, input),
      decideReviewCore(db!, { id: row.reviewerId, isCurator: true }, input),
    ]);
    expect(concurrent.filter((result) => result.ok)).toHaveLength(1);
    expect(concurrent.filter((result) => !result.ok)).toEqual([
      { ok: false, error: "Already reviewed or no longer pending." },
    ]);

    const [component] = await db!.select({ status: schema.components.reviewStatus }).from(schema.components).where(eq(schema.components.id, row.componentId));
    const [records] = await db!.select({ value: count() }).from(schema.reviewRecords).where(eq(schema.reviewRecords.componentId, row.componentId));
    expect(component.status).toBe("approved");
    expect(records.value).toBe(1);
  });

  it("preserves prior review records across a later decision", async () => {
    const row = await fixture();
    const first = await decideReviewCore(db!, { id: row.reviewerId, isCurator: true }, {
      componentId: row.componentId,
      decision: "approve",
      rationale: "First durable rationale.",
      checklist,
    });
    expect(first.ok).toBe(true);
    await db!.update(schema.components).set({ reviewStatus: "pending" }).where(eq(schema.components.id, row.componentId));
    const second = await decideReviewCore(db!, { id: row.reviewerId, isCurator: true }, {
      componentId: row.componentId,
      decision: "request-changes",
      rationale: "Second durable rationale after resubmission.",
      checklist,
    });
    expect(second.ok).toBe(true);

    const records = await db!.select({ rationale: schema.reviewRecords.rationale }).from(schema.reviewRecords).where(eq(schema.reviewRecords.componentId, row.componentId));
    expect(records.map((record) => record.rationale).sort()).toEqual([
      "First durable rationale.",
      "Second durable rationale after resubmission.",
    ]);
  });

  it("rejects direct role bypass and atomically audits owner changes", async () => {
    const row = await fixture();
    await expect(setCuratorRoleCore(db!, { id: row.reviewerId, isOwner: false }, { userId: row.reviewerId, curator: false })).resolves.toEqual({ ok: false, error: "Not authorized." });
    expect((await setCuratorRoleCore(db!, { id: row.ownerId, isOwner: true }, { userId: row.reviewerId, curator: false })).ok).toBe(true);
    await expect(setCuratorRoleCore(db!, { id: row.ownerId, isOwner: true }, { userId: row.reviewerId, curator: false })).resolves.toEqual({ ok: false, error: "User not found or role already set." });
    expect((await setCuratorRoleCore(db!, { id: row.ownerId, isOwner: true }, { userId: row.reviewerId, curator: true })).ok).toBe(true);

    const events = await db!.select({ prior: schema.roleChangeEvents.priorValue, next: schema.roleChangeEvents.nextValue }).from(schema.roleChangeEvents).where(eq(schema.roleChangeEvents.targetUserId, row.reviewerId));
    expect(events).toEqual([
      { prior: true, next: false },
      { prior: false, next: true },
    ]);
  });
});
