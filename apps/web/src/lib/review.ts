/**
 * Component curation. Nothing is publicly listed until a curator approves it.
 * On submit we post a Discord webhook to the review channel with a link to the
 * curator-gated review page. Approve/reject are server functions guarded by the
 * caller's `isCurator` flag — a leaked link cannot act on its own.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { desc, eq, sql } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import {
  REVIEW_STANDARD_LIMITATIONS,
  REVIEW_STANDARD_VERSION,
  validateChecklist,
  type Checklist,
  type ReviewDecision,
} from "./review-standard";

type Db = NeonHttpDatabase<typeof schema>;

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
  listingKind: "component" | "tool";
  submissionKind?: "new" | "edit";
  origin: string;
}): Promise<void> {
  const webhookUrl = process.env.REVIEW_WEBHOOK_URL;
  if (!webhookUrl) return;
  const reviewUrl = `${input.origin}/${input.listingKind === "tool" ? "dashboard/review-tool" : "review"}/${input.componentId}`;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: `${input.submissionKind === "edit" ? "Edited" : "New"} ${input.listingKind === "tool" ? "tool/site" : "component"} awaiting review`,
            url: reviewUrl,
            description: `**${input.title}** by @${input.username}`,
            color: 0x6366f1,
            fields: [
              { name: "Category", value: input.category, inline: true },
              { name: "Type", value: input.listingKind === "tool" ? "External tool/site" : input.paid ? "Paid component" : "Free component", inline: true },
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
  listingKind: "component" | "tool";
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
        listingKind: schema.components.listingKind,
        status: schema.components.reviewStatus,
        submittedAt: schema.components.submittedAt,
      })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(eq(schema.components.reviewStatus, "pending"))
      .orderBy(desc(schema.components.submittedAt))
      .limit(100);

    const editRows = await db
      .select({
        id: schema.components.id,
        name: schema.components.name,
        namespace: schema.namespaces.name,
        payload: schema.toolListingDrafts.payload,
        submittedAt: schema.toolListingDrafts.submittedAt,
      })
      .from(schema.toolListingDrafts)
      .innerJoin(schema.components, eq(schema.components.id, schema.toolListingDrafts.componentId))
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(eq(schema.toolListingDrafts.status, "pending"))
      .orderBy(desc(schema.toolListingDrafts.submittedAt))
      .limit(100);

    return {
      ok: true,
      isCurator: true,
      items: [...rows.map((row) => ({
        id: row.id,
        title: row.title,
        name: row.name,
        namespace: row.namespace,
        category: row.category,
        paid: row.sourceModel !== "open-source" && row.sourceModel !== "external-site",
        listingKind: row.listingKind,
        status: row.status,
        submittedAt: row.submittedAt.toISOString(),
      })), ...editRows.map((row) => ({
        id: row.id,
        title: row.payload.title,
        name: row.name,
        namespace: row.namespace,
        category: row.payload.category,
        paid: false,
        listingKind: "tool" as const,
        status: "pending" as const,
        submittedAt: row.submittedAt.toISOString(),
      }))]
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 100),
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

export interface ReviewActor {
  id: string;
  isCurator: boolean;
}

interface ReviewNotification {
  decision: ReviewDecision;
  name: string;
  title: string;
  namespaceId: string;
}

export async function decideReviewCore(
  db: Db,
  actor: ReviewActor | null,
  data: ReviewDecisionInput,
  now = new Date(),
): Promise<{ ok: boolean; error?: string; notification?: ReviewNotification }> {
  if (!actor?.isCurator) return { ok: false, error: "Curators only." };
  if (!data.componentId) return { ok: false, error: "Missing component." };
  if (!data.rationale) return { ok: false, error: "A rationale is required for every decision, including approval." };
  if (!DECISIONS.includes(data.decision)) return { ok: false, error: "Unknown decision." };
  const checked = validateChecklist(data.checklist);
  if (!checked.ok) return { ok: false, error: checked.error };

  const nextStatus = data.decision === "approve" ? "approved" : data.decision === "escalate" ? "pending" : "rejected";
  const reviewReason = nextStatus === "rejected" ? data.rationale : null;
  const result = await db.execute<{
    id: string;
    name: string;
    title: string;
    namespaceId: string;
  }>(sql`
    with updated as (
      update components
      set review_status = ${nextStatus},
          review_reason = ${reviewReason},
          reviewed_by = ${actor.id},
          reviewed_at = ${now},
          updated_at = ${now}
      where id = ${data.componentId}
        and review_status = 'pending'
      returning id, name, title, namespace_id, latest_version_id
    ), recorded as (
      insert into review_records (
        component_id, component_version_id, reviewer_user_id,
        standard_version, decision, checklist, rationale, limitations
      )
      select id, latest_version_id, ${actor.id}, ${REVIEW_STANDARD_VERSION},
        ${data.decision}, ${JSON.stringify(checked.checklist)}::jsonb,
        ${data.rationale}, ${REVIEW_STANDARD_LIMITATIONS}
      from updated
      returning component_id
    )
    select updated.id, updated.name, updated.title,
      updated.namespace_id as "namespaceId"
    from updated
    inner join recorded on recorded.component_id = updated.id
  `);
  const component = result.rows[0];
  if (!component) return { ok: false, error: "Already reviewed or no longer pending." };
  return {
    ok: true,
    notification: {
      decision: data.decision,
      name: component.name,
      title: component.title,
      namespaceId: component.namespaceId,
    },
  };
}

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
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };
    const result = await decideReviewCore(db, user ? { id: user.id, isCurator: user.isCurator } : null, data as ReviewDecisionInput);
    if (!result.ok || !result.notification) return { ok: result.ok, error: result.error };
    if (result.notification.decision === "escalate") return { ok: true };

    // Notify the creator after the atomic decision and record commit.
    const component = result.notification;
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
      if (component.decision === "approve") await email.emailReviewApproved(owner.email, component.title, ref);
      else await email.emailReviewRejected(owner.email, component.title, data.rationale);
    }

    return { ok: true };
  });
