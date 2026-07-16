import { afterEach, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { count, eq } from "drizzle-orm";
import { schema } from "@modulora/db";

import { decideToolReviewCore } from "../src/lib/tool-review";
import { TOOL_REVIEW_CHECKS, type ToolReviewChecklist } from "../src/lib/tool-review-standard";

const databaseUrl = process.env.DATABASE_URL;
const db = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null;
const cleanup = new Set<{ namespaceId: string; ownerId: string; curatorId: string }>();
const checklist = Object.fromEntries(TOOL_REVIEW_CHECKS.map((check) => [check.id, "pass"])) as ToolReviewChecklist;

afterEach(async () => {
  if (!db) return;
  for (const row of cleanup) {
    await db.delete(schema.namespaces).where(eq(schema.namespaces.id, row.namespaceId));
    await db.delete(schema.users).where(eq(schema.users.id, row.curatorId));
    await db.delete(schema.users).where(eq(schema.users.id, row.ownerId));
  }
  cleanup.clear();
});

async function fixture() {
  const suffix = crypto.randomUUID();
  const ownerId = `tool-owner-${suffix}`;
  const curatorId = `tool-curator-${suffix}`;
  await db!.insert(schema.users).values([
    { id: ownerId, name: "Tool Owner", email: `${ownerId}@example.com` },
    { id: curatorId, name: "Tool Curator", email: `${curatorId}@example.com`, isCurator: true },
  ]);
  const [namespace] = await db!.insert(schema.namespaces).values({ name: `tool-edit-${suffix}`.slice(0, 40), ownerUserId: ownerId }).returning({ id: schema.namespaces.id });
  const [component] = await db!.insert(schema.components).values({
    namespaceId: namespace.id,
    name: "editable-tool",
    title: "Published title",
    description: "The currently approved public tool description.",
    category: "utilities",
    listingKind: "tool",
    componentType: "tool",
    framework: "web",
    itemType: "modulora:tool",
    sourceModel: "external-site",
    reviewStatus: "approved",
    siteUrl: "https://published.example.com/",
    siteDomain: "published.example.com",
    showcaseImageUrls: ["/i/tool-showcases/owner/published.webp"],
    toolPricing: "free",
  }).returning({ id: schema.components.id });
  const [published] = await db!.insert(schema.componentVersions).values({ componentId: component.id, version: "1.0.0", licenseKind: "custom", registryItem: { kind: "tool" } }).returning({ id: schema.componentVersions.id });
  const [draftVersion] = await db!.insert(schema.componentVersions).values({ componentId: component.id, version: "1.0.1", licenseKind: "custom", registryItem: { kind: "tool", title: "Edited title" } }).returning({ id: schema.componentVersions.id });
  await db!.update(schema.components).set({ latestVersionId: published.id }).where(eq(schema.components.id, component.id));
  await db!.insert(schema.toolListingDrafts).values({
    componentId: component.id,
    componentVersionId: draftVersion.id,
    payload: {
      title: "Edited title",
      description: "The complete edited tool description awaiting review.",
      category: "layout",
      siteUrl: "https://edited.example.com/",
      siteDomain: "edited.example.com",
      ogTitle: "Edited OG title",
      ogDescription: "Edited OG description",
      ogImageUrl: null,
      showcaseImageUrls: ["/i/tool-showcases/owner/edited.webp"],
      pricing: "freemium",
    },
  });
  cleanup.add({ namespaceId: namespace.id, ownerId, curatorId });
  return { componentId: component.id, draftVersionId: draftVersion.id, curatorId };
}

describe.skipIf(!databaseUrl)("tool edit review contracts", () => {
  it("keeps the approved row public until one atomic edit approval wins", async () => {
    const row = await fixture();
    const [before] = await db!.select({ title: schema.components.title, status: schema.components.reviewStatus }).from(schema.components).where(eq(schema.components.id, row.componentId));
    expect(before).toEqual({ title: "Published title", status: "approved" });

    const input = { componentId: row.componentId, componentVersionId: row.draftVersionId, decision: "approve" as const, rationale: "The complete edited listing passes every tool review check.", checklist };
    const results = await Promise.all([
      decideToolReviewCore(db!, { id: row.curatorId, isCurator: true }, input),
      decideToolReviewCore(db!, { id: row.curatorId, isCurator: true }, input),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);

    const [after] = await db!.select({ title: schema.components.title, status: schema.components.reviewStatus, latestVersionId: schema.components.latestVersionId, siteDomain: schema.components.siteDomain, pricing: schema.components.toolPricing }).from(schema.components).where(eq(schema.components.id, row.componentId));
    expect(after).toEqual({ title: "Edited title", status: "approved", latestVersionId: row.draftVersionId, siteDomain: "edited.example.com", pricing: "freemium" });
    const [drafts] = await db!.select({ value: count() }).from(schema.toolListingDrafts).where(eq(schema.toolListingDrafts.componentId, row.componentId));
    const [records] = await db!.select({ value: count() }).from(schema.reviewRecords).where(eq(schema.reviewRecords.componentId, row.componentId));
    expect(drafts.value).toBe(0);
    expect(records.value).toBe(1);
  });

  it("keeps the approved version public when an edit needs changes", async () => {
    const row = await fixture();
    const result = await decideToolReviewCore(db!, { id: row.curatorId, isCurator: true }, {
      componentId: row.componentId,
      componentVersionId: row.draftVersionId,
      decision: "request-changes",
      rationale: "Replace the first thumbnail so it accurately represents the current site.",
      checklist,
    });
    expect(result.ok).toBe(true);
    const [component] = await db!.select({ title: schema.components.title, status: schema.components.reviewStatus }).from(schema.components).where(eq(schema.components.id, row.componentId));
    const [draft] = await db!.select({ status: schema.toolListingDrafts.status, reason: schema.toolListingDrafts.reviewReason }).from(schema.toolListingDrafts).where(eq(schema.toolListingDrafts.componentId, row.componentId));
    expect(component).toEqual({ title: "Published title", status: "approved" });
    expect(draft).toEqual({ status: "changes-requested", reason: "Replace the first thumbnail so it accurately represents the current site." });
  });
});
