import { afterEach, describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { runSimilarityGate } from "../src/lib/similarity-gate";

const databaseUrl = process.env.DATABASE_URL;
const db = databaseUrl ? drizzle(neon(databaseUrl), { schema }) : null;
const cleanupScreens: string[] = [];
let cleanupEvidenceVersion: string | null = null;

afterEach(async () => {
  if (!db) return;
  for (const id of cleanupScreens) {
    await db.delete(schema.similarityScreens).where(eq(schema.similarityScreens.id, id));
  }
  cleanupScreens.length = 0;
  if (cleanupEvidenceVersion) {
    await db
      .delete(schema.evidenceRecords)
      .where(
        and(
          eq(schema.evidenceRecords.componentVersionId, cleanupEvidenceVersion),
          eq(schema.evidenceRecords.type, "similarity-screen"),
        ),
      );
    cleanupEvidenceVersion = null;
  }
});

describe.skipIf(!databaseUrl)("similarity gate against the real corpus", () => {
  it("blocks a renamed cross-owner copy and persists an explainable screen", async (ctx) => {
    const componentsRows = await db!
      .select({
        id: schema.components.id,
        latest: schema.components.latestVersionId,
        ownerUserId: schema.namespaces.ownerUserId,
      })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(and(eq(schema.components.reviewStatus, "approved"), eq(schema.components.visibility, "public")))
      .limit(2);
    if (componentsRows.length < 2) return ctx.skip(); // needs two published components to exercise self-exclusion
    const component = componentsRows[0]!;
    // Attribute the synthetic submission to a DIFFERENT existing component so
    // the corpus self-exclusion doesn't hide the copied source.
    const submissionComponentId = componentsRows[1]!.id;
    expect(component.latest).toBeTruthy();
    const files = await db!
      .select({ path: schema.componentFiles.path, content: schema.componentFiles.content, role: schema.componentFiles.role })
      .from(schema.componentFiles)
      .where(eq(schema.componentFiles.componentVersionId, component.latest!));
    const install = files
      .filter((file) => file.role === "component" && file.content)
      .map((file) => ({ path: `renamed/${file.path}`, content: `// totally original\n${file.content}` }));
    expect(install.length).toBeGreaterThan(0);
    // Any user who does NOT own the copied component works as the submitter.
    const users = await db!.select({ id: schema.users.id }).from(schema.users).limit(10);
    const otherOwner = users.find((row) => row.id !== component.ownerUserId);
    if (!otherOwner) return ctx.skip();

    cleanupEvidenceVersion = component.latest!;
    const outcome = await runSimilarityGate(db!, {
      componentId: submissionComponentId,
      componentVersionId: component.latest!,
      ownerUserId: otherOwner.id,
      files: install,
    });
    if (outcome.screenId) cleanupScreens.push(outcome.screenId);

    expect(outcome.status).toBe("blocked");
    expect(outcome.candidates.length).toBeGreaterThan(0);
    expect(outcome.candidates[0]!.files.length).toBeGreaterThan(0);

    const [screen] = await db!
      .select()
      .from(schema.similarityScreens)
      .where(eq(schema.similarityScreens.id, outcome.screenId!));
    expect(screen.status).toBe("blocked");
    expect(screen.corpusLimitation.length).toBeGreaterThan(40);
  });
});
