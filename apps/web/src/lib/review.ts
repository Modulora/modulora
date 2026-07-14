/**
 * Component curation. Nothing is publicly listed until a curator approves it.
 * On submit we post a Discord webhook to the review channel with a link to the
 * curator-gated review page. Approve/reject are server functions guarded by the
 * caller's `isCurator` flag — a leaked link cannot act on its own.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import {
  REVIEW_STANDARD_LIMITATIONS,
  REVIEW_STANDARD_VERSION,
  validateChecklist,
  type Checklist,
  type ReviewDecision,
} from "./review-standard";

function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  return drizzle(neon(databaseUrl), { schema });
}

/** Post a submission to the Discord review channel. Never throws. */
export async function fireReviewWebhook(input: {
  componentId: string;
  title: string;
  username: string;
  name: string;
  category: string;
  paid: boolean;
  origin: string;
}): Promise<void> {
  const webhookUrl = process.env.REVIEW_WEBHOOK_URL;
  if (!webhookUrl) return;
  const reviewUrl = `${input.origin}/review/${input.componentId}`;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "New component awaiting review",
            url: reviewUrl,
            description: `**${input.title}** by @${input.username}`,
            color: 0x6366f1,
            fields: [
              { name: "Category", value: input.category, inline: true },
              { name: "Pricing", value: input.paid ? "Paid" : "Free", inline: true },
              { name: "Review", value: `[Open review page](${reviewUrl})` },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: "Curators approve or reject on the review page (sign-in required)." },
          },
        ],
      }),
    });
  } catch {
    // Submission still succeeds even if the webhook is down.
  }
}

export interface ReviewListItem {
  id: string;
  title: string;
  name: string;
  namespace: string;
  category: string;
  paid: boolean;
  status: "draft" | "pending" | "approved" | "rejected";
  submittedAt: string;
}

/** Curator-only: list components awaiting review (pending first). */
export const fetchReviewQueue = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; items: ReviewListItem[]; isCurator: boolean }> => {
    const request = getRequest();
    if (!request) return { ok: false, items: [], isCurator: false };
    const user = await getCurrentUser(request);
    if (!user?.isCurator) return { ok: false, items: [], isCurator: false };
    const db = getDb();
    if (!db) return { ok: false, items: [], isCurator: true };

    const rows = await db
      .select({
        id: schema.components.id,
        title: schema.components.title,
        name: schema.components.name,
        namespace: schema.namespaces.name,
        category: schema.components.category,
        sourceModel: schema.components.sourceModel,
        status: schema.components.reviewStatus,
        submittedAt: schema.components.submittedAt,
      })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(eq(schema.components.reviewStatus, "pending"))
      .orderBy(desc(schema.components.submittedAt))
      .limit(100);

    return {
      ok: true,
      isCurator: true,
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        name: row.name,
        namespace: row.namespace,
        category: row.category,
        paid: row.sourceModel !== "open-source",
        status: row.status,
        submittedAt: row.submittedAt.toISOString(),
      })),
    };
  },
);

export interface ReviewDecisionInput {
  componentId: string;
  decision: ReviewDecision;
  rationale: string;
  checklist: Checklist;
}

const DECISIONS: readonly ReviewDecision[] = ["approve", "request-changes", "reject", "escalate"];

/**
 * Curator-only. Every outcome — including approval — requires an explicit
 * per-check checklist and a rationale, and writes an append-only review
 * record naming the standard version. Escalation leaves the submission
 * pending for an owner or second curator.
 */
export const decideReview = createServerFn({ method: "POST" })
  .validator((data: ReviewDecisionInput) => ({
    componentId: String(data.componentId ?? "").trim(),
    decision: DECISIONS.includes(data.decision) ? data.decision : ("escalate" as const),
    rationale: String(data.rationale ?? "").trim().slice(0, 2000),
    checklist: data.checklist as unknown,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    if (!request) return { ok: false, error: "No request context." };
    const user = await getCurrentUser(request);
    if (!user?.isCurator) return { ok: false, error: "Curators only." };
    if (!data.componentId) return { ok: false, error: "Missing component." };
    if (!data.rationale) {
      return { ok: false, error: "A rationale is required for every decision, including approval." };
    }
    const checked = validateChecklist(data.checklist);
    if (!checked.ok) return { ok: false, error: checked.error };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    // Escalation records a decision but leaves the submission pending.
    const nextStatus =
      data.decision === "approve" ? "approved" : data.decision === "escalate" ? "pending" : "rejected";

    const updated = await db
      .update(schema.components)
      .set({
        reviewStatus: nextStatus,
        reviewReason: nextStatus === "rejected" ? data.rationale : null,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.components.id, data.componentId), eq(schema.components.reviewStatus, "pending")))
      .returning({
        id: schema.components.id,
        name: schema.components.name,
        title: schema.components.title,
        namespaceId: schema.components.namespaceId,
        latestVersionId: schema.components.latestVersionId,
      });
    if (updated.length === 0) return { ok: false, error: "Already reviewed or no longer pending." };

    // Append-only audit record; historical records are never rewritten.
    await db.insert(schema.reviewRecords).values({
      componentId: data.componentId,
      componentVersionId: updated[0]!.latestVersionId,
      reviewerUserId: user.id,
      standardVersion: REVIEW_STANDARD_VERSION,
      decision: data.decision,
      checklist: checked.checklist,
      rationale: data.rationale,
      limitations: REVIEW_STANDARD_LIMITATIONS,
    });

    if (data.decision === "escalate") return { ok: true };

    // Notify the creator (fire-and-forget — the decision never blocks on email).
    const component = updated[0]!;
    const [owner] = await db
      .select({ email: schema.users.email, namespace: schema.namespaces.name })
      .from(schema.namespaces)
      .innerJoin(schema.users, eq(schema.users.id, schema.namespaces.ownerUserId))
      .where(eq(schema.namespaces.id, component.namespaceId))
      .limit(1);
    if (owner) {
      const ref = `@${owner.namespace}/${component.name}`;
      // Awaited: dangling promises are cancelled in the Workers runtime.
      const email = await import("./email");
      if (data.decision === "approve") await email.emailReviewApproved(owner.email, component.title, ref);
      else await email.emailReviewRejected(owner.email, component.title, data.rationale);
    }

    return { ok: true };
  });
