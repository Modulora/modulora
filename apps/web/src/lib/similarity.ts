/**
 * Similarity hold workflow (#67): the submitter classifies material matches
 * (a claim, never a verdict) and a curator resolves the hold with a recorded
 * rationale. Resolutions append to the screen row; the screen itself and the
 * release stay immutable.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { MATCH_CLASSIFICATIONS, type MatchClassification } from "./similarity-core";

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

const CLASSIFICATION_IDS = MATCH_CLASSIFICATIONS.map((c) => c.id);

export interface ClassificationEntry {
  ref: string;
  classification: MatchClassification;
  url: string;
  note: string;
}

/** Creator-only: record how they classify each material match on their own hold. */
export const classifySimilarityMatches = createServerFn({ method: "POST" })
  .validator((data: { screenId: string; entries: ClassificationEntry[] }) => ({
    screenId: String(data.screenId ?? "").trim(),
    entries: (Array.isArray(data.entries) ? data.entries : []).slice(0, 10).map((entry) => ({
      ref: String(entry.ref ?? "").slice(0, 120),
      classification: CLASSIFICATION_IDS.includes(entry.classification)
        ? entry.classification
        : ("false-positive" as const),
      url: String(entry.url ?? "").trim().slice(0, 500),
      note: String(entry.note ?? "").trim().slice(0, 500),
    })),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false, error: "You must be signed in." };
    const db = getDb();
    if (!db || !data.screenId) return { ok: false, error: "Invalid request." };

    // Ownership: the screen's component must belong to the caller's namespace.
    const [screen] = await db
      .select({
        id: schema.similarityScreens.id,
        ownerUserId: schema.namespaces.ownerUserId,
        resolution: schema.similarityScreens.resolution,
      })
      .from(schema.similarityScreens)
      .innerJoin(schema.components, eq(schema.components.id, schema.similarityScreens.componentId))
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(eq(schema.similarityScreens.id, data.screenId))
      .limit(1);
    if (!screen || screen.ownerUserId !== user.id) return { ok: false, error: "Not your submission." };
    // The classification is part of what the curator resolved against — it
    // can't be rewritten after resolution (escalated holds stay open).
    if (screen.resolution !== null && screen.resolution !== "escalated") {
      return { ok: false, error: "This hold was already resolved; resubmit to start a new screen." };
    }

    await db
      .update(schema.similarityScreens)
      .set({ submitterClassification: { entries: data.entries, classifiedAt: new Date().toISOString() } })
      .where(
        and(
          eq(schema.similarityScreens.id, data.screenId),
          or(isNull(schema.similarityScreens.resolution), eq(schema.similarityScreens.resolution, "escalated")),
        ),
      );
    return { ok: true };
  });

export interface SimilarityHold {
  screenId: string;
  componentId: string;
  ref: string;
  title: string;
  status: string;
  createdAt: string;
  escalated: boolean;
  candidates: { ref: string; confidence: string | null }[];
  classified: boolean;
}

/** Curator-only: unresolved (or escalated) similarity holds. */
export const listSimilarityHolds = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; holds: SimilarityHold[] }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user?.isCurator) return { ok: false, holds: [] };
    const db = getDb();
    if (!db) return { ok: false, holds: [] };

    const rows = await db
      .select({
        screenId: schema.similarityScreens.id,
        componentId: schema.similarityScreens.componentId,
        status: schema.similarityScreens.status,
        results: schema.similarityScreens.results,
        classification: schema.similarityScreens.submitterClassification,
        resolution: schema.similarityScreens.resolution,
        createdAt: schema.similarityScreens.createdAt,
        name: schema.components.name,
        title: schema.components.title,
        namespace: schema.namespaces.name,
      })
      .from(schema.similarityScreens)
      .innerJoin(schema.components, eq(schema.components.id, schema.similarityScreens.componentId))
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(
        and(
          eq(schema.similarityScreens.status, "blocked"),
          or(isNull(schema.similarityScreens.resolution), eq(schema.similarityScreens.resolution, "escalated")),
        ),
      )
      .orderBy(desc(schema.similarityScreens.createdAt))
      .limit(50);

    return {
      ok: true,
      holds: rows.map((row) => {
        const candidates = ((row.results as { candidates?: { ref: string; confidence: string | null }[] })?.candidates ?? []).map(
          (candidate) => ({ ref: candidate.ref, confidence: candidate.confidence }),
        );
        return {
          screenId: row.screenId,
          componentId: row.componentId,
          ref: `@${row.namespace}/${row.name}`,
          title: row.title,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          escalated: row.resolution === "escalated",
          candidates: candidates.slice(0, 5),
          classified: row.classification != null,
        };
      }),
    };
  },
);

const RESOLUTIONS = ["cleared", "authorized-derivative", "attribution-required", "rejected", "escalated"] as const;
export type HoldResolution = (typeof RESOLUTIONS)[number];

/**
 * Curator-only. Clearing or linking as an authorized derivative sends the
 * submission into the normal review queue — it still gets a full alpha-1
 * review. Rejection and attribution-required return it to the creator.
 */
export const resolveSimilarityHold = createServerFn({ method: "POST" })
  .validator((data: { screenId: string; resolution: HoldResolution; rationale: string }) => ({
    screenId: String(data.screenId ?? "").trim(),
    resolution: String(data.resolution ?? ""),
    rationale: String(data.rationale ?? "").trim().slice(0, 2000),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user?.isCurator) return { ok: false, error: "Curators only." };
    // Never coerce an unknown resolution into a different action.
    if (!RESOLUTIONS.includes(data.resolution as HoldResolution)) {
      return { ok: false, error: "Unknown resolution." };
    }
    const resolution = data.resolution as HoldResolution;
    if (!data.rationale) return { ok: false, error: "A rationale is required for every resolution." };
    const db = getDb();
    if (!db || !data.screenId) return { ok: false, error: "Invalid request." };

    // The resolution must apply to the exact release that was screened. If
    // the creator swapped in new draft content since, refuse: the curator
    // would be resolving a hold against files they never compared.
    const [held] = await db
      .select({
        screenedVersionId: schema.similarityScreens.componentVersionId,
        latestVersionId: schema.components.latestVersionId,
      })
      .from(schema.similarityScreens)
      .innerJoin(schema.components, eq(schema.components.id, schema.similarityScreens.componentId))
      .where(eq(schema.similarityScreens.id, data.screenId))
      .limit(1);
    if (!held) return { ok: false, error: "Hold not found." };
    if (held.latestVersionId !== held.screenedVersionId) {
      return {
        ok: false,
        error: "The submission changed since this screen ran. Ask the creator to resubmit so a fresh screen covers the current files.",
      };
    }

    const updated = await db
      .update(schema.similarityScreens)
      .set({
        resolution,
        resolutionRationale: data.rationale,
        resolvedBy: user.id,
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(schema.similarityScreens.id, data.screenId),
          eq(schema.similarityScreens.status, "blocked"),
          or(isNull(schema.similarityScreens.resolution), eq(schema.similarityScreens.resolution, "escalated")),
        ),
      )
      .returning({ componentId: schema.similarityScreens.componentId });
    if (updated.length === 0) return { ok: false, error: "Already resolved or not held." };
    const componentId = updated[0]!.componentId;

    if (resolution === "cleared" || resolution === "authorized-derivative") {
      await db
        .update(schema.components)
        .set({ reviewStatus: "pending", submittedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(schema.components.id, componentId),
            eq(schema.components.reviewStatus, "draft"),
            // Atomic version-match: a draft swapped in between the check
            // above and this promotion can never enter review unscreened.
            eq(schema.components.latestVersionId, held.screenedVersionId),
          ),
        );
    } else if (resolution === "rejected" || resolution === "attribution-required") {
      // Guarded to the held draft: a stale hold can never delist a release
      // that was since re-screened and approved.
      await db
        .update(schema.components)
        .set({
          reviewStatus: "rejected",
          reviewReason: data.rationale,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(schema.components.id, componentId), eq(schema.components.reviewStatus, "draft")));
    }
    return { ok: true };
  });
