/**
 * Server side of similarity screening (#67): builds the corpus from
 * Modulora's own published releases, runs the pure engine, persists the
 * screen + scoped evidence, and reports whether the submission may enter
 * the review queue. Scanner failures fail closed — a submission never
 * silently passes into review.
 */
import { eq, and, ne, isNull } from "drizzle-orm";
import { schema } from "@modulora/db";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import {
  screenSubmission,
  SIMILARITY_CORPUS_LIMITATION,
  SIMILARITY_METHOD_VERSION,
  type CandidateInput,
  type ScreenResult,
} from "./similarity-core";

type Db = NeonHttpDatabase<typeof schema>;

async function sha256Hex(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Latest APPROVED, PUBLIC, unmoderated, non-revoked release files from every
 * OTHER owner. Drafts, pending, and rejected submissions are deliberately
 * excluded: they are unpublished work whose existence, names, and file paths
 * must never leak to another submitter — and screening copy promises the
 * corpus is "published Modulora releases", which must stay literally true.
 */
async function loadCorpus(db: Db, excludeOwnerUserId: string, excludeComponentId: string): Promise<CandidateInput[]> {
  const rows = await db
    .select({
      componentId: schema.components.id,
      componentVersionId: schema.componentVersions.id,
      name: schema.components.name,
      namespace: schema.namespaces.name,
      ownerUserId: schema.namespaces.ownerUserId,
      path: schema.componentFiles.path,
      content: schema.componentFiles.content,
    })
    .from(schema.componentFiles)
    .innerJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.componentFiles.componentVersionId))
    .innerJoin(schema.components, eq(schema.components.id, schema.componentVersions.componentId))
    .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
    .where(
      and(
        eq(schema.components.latestVersionId, schema.componentVersions.id),
        eq(schema.components.reviewStatus, "approved"),
        eq(schema.components.visibility, "public"),
        isNull(schema.components.moderationState),
        isNull(schema.componentVersions.revokedAt),
        eq(schema.componentFiles.role, "component"),
        ne(schema.components.id, excludeComponentId),
      ),
    )
    // Deterministic under the cap: the oldest releases are the ones a copy
    // would plagiarize, so they stay in the corpus as the catalog grows.
    .orderBy(schema.components.createdAt, schema.componentFiles.orderIndex)
    .limit(5000);

  const byVersion = new Map<string, CandidateInput>();
  for (const row of rows) {
    if (row.ownerUserId === excludeOwnerUserId || !row.ownerUserId || row.content == null) continue;
    let candidate = byVersion.get(row.componentVersionId);
    if (!candidate) {
      candidate = {
        componentId: row.componentId,
        componentVersionId: row.componentVersionId,
        ref: `@${row.namespace}/${row.name}`,
        ownerUserId: row.ownerUserId,
        files: [],
      };
      byVersion.set(row.componentVersionId, candidate);
    }
    candidate.files.push({ path: row.path, content: row.content, sha256: await sha256Hex(row.content) });
  }
  return [...byVersion.values()];
}

export interface GateOutcome {
  /** "clear" | "potential" enter the queue; "blocked" holds; "error" fails closed. */
  status: "clear" | "potential" | "blocked" | "error";
  screenId: string | null;
  /** Candidate summaries safe to show the submitter. */
  candidates: { ref: string; confidence: string | null; files: { path: string; candidatePath: string; score: number }[] }[];
}

export async function runSimilarityGate(
  db: Db,
  input: {
    componentId: string;
    componentVersionId: string;
    ownerUserId: string;
    files: { path: string; content: string }[];
  },
): Promise<GateOutcome> {
  let result: ScreenResult;
  let screenId: string | null = null;
  try {
    const corpus = await loadCorpus(db, input.ownerUserId, input.componentId);
    const files = await Promise.all(
      input.files.map(async (file) => ({ ...file, sha256: await sha256Hex(file.content) })),
    );
    result = screenSubmission({ ownerUserId: input.ownerUserId, files }, corpus);

    // Persistence stays INSIDE the try: a screen that isn't durably recorded
    // must fail closed rather than pass the submission into review.
    const [row] = await db
      .insert(schema.similarityScreens)
      .values({
        componentId: input.componentId,
        componentVersionId: input.componentVersionId,
        methodVersion: result.methodVersion,
        status: result.status,
        results: { candidates: result.candidates } as unknown as Record<string, unknown>,
        corpusLimitation: result.corpusLimitation,
      })
      .returning({ id: schema.similarityScreens.id });
    screenId = row?.id ?? null;

    await db.insert(schema.evidenceRecords).values({
      componentVersionId: input.componentVersionId,
      type: "similarity-screen",
      status: result.status === "clear" ? "passed" : "warning",
      issuer: "modulora-platform",
      toolVersion: result.methodVersion,
      scope:
        result.status === "clear"
          ? "No material similarity to other creators' published Modulora releases was detected."
          : `Similarity candidates were detected against ${result.candidates.length} published release(s) and require human review.`,
      limitations: result.corpusLimitation,
    });
  } catch (error) {
    console.error("similarity screening failed", error);
    // Fail closed: record the failure; the caller must keep the draft out of review.
    try {
      const [row] = await db
        .insert(schema.similarityScreens)
        .values({
          componentId: input.componentId,
          componentVersionId: input.componentVersionId,
          methodVersion: SIMILARITY_METHOD_VERSION,
          status: "error",
          results: { error: "screening-failed" },
          corpusLimitation: SIMILARITY_CORPUS_LIMITATION,
        })
        .returning({ id: schema.similarityScreens.id });
      return { status: "error", screenId: row?.id ?? null, candidates: [] };
    } catch {
      return { status: "error", screenId: null, candidates: [] };
    }
  }

  return {
    status: result.status,
    screenId,
    candidates: result.candidates.map((candidate) => ({
      ref: candidate.ref,
      confidence: candidate.confidence,
      files: candidate.matches
        .filter((match) => !match.scaffolding)
        .slice(0, 5)
        .map((match) => ({ path: match.path, candidatePath: match.candidatePath, score: match.score })),
    })),
  };
}
