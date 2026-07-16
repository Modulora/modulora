import { and, eq, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { schema } from "@modulora/db";

import {
  TOOL_REVIEW_LIMITATIONS,
  TOOL_REVIEW_STANDARD_VERSION,
  validateToolReviewChecklist,
  type ToolReviewChecklist,
  type ToolReviewDecision,
} from "./tool-review-standard";

export interface ToolReviewDecisionInput {
  componentId: string;
  componentVersionId: string;
  decision: ToolReviewDecision;
  rationale: string;
  checklist: ToolReviewChecklist;
}

export async function decideToolReviewCore(
  db: NeonHttpDatabase<typeof schema>,
  actor: { id: string; isCurator: boolean } | null,
  data: ToolReviewDecisionInput,
  now = new Date(),
): Promise<{ ok: boolean; error?: string }> {
  if (!actor?.isCurator) return { ok: false, error: "Curator access required." };
  const checked = validateToolReviewChecklist(data.checklist);
  if (!checked.ok) return checked;
  if (!("approve request-changes reject escalate".split(" ") as string[]).includes(data.decision)) return { ok: false, error: "Invalid decision." };
  if (data.rationale.trim().length < 20) return { ok: false, error: "Provide a specific rationale of at least 20 characters." };

  const [pendingEdit] = await db.select({ componentId: schema.toolListingDrafts.componentId }).from(schema.toolListingDrafts).where(and(eq(schema.toolListingDrafts.componentId, data.componentId), eq(schema.toolListingDrafts.componentVersionId, data.componentVersionId), eq(schema.toolListingDrafts.status, "pending"))).limit(1);
  if (pendingEdit) {
    const draftStatus = data.decision === "approve" ? null : data.decision === "request-changes" ? "changes-requested" : data.decision === "reject" ? "rejected" : "pending";
    const draftResult = data.decision === "approve"
      ? await db.execute(sql`
          with draft as (
            select * from tool_listing_drafts
            where component_id = ${data.componentId} and component_version_id = ${data.componentVersionId} and status = 'pending'
          ), updated as (
            update components as component
            set title = draft.payload->>'title',
                description = draft.payload->>'description',
                category = draft.payload->>'category',
                original_url = draft.payload->>'siteUrl',
                preview_image_url = draft.payload->'showcaseImageUrls'->>0,
                site_url = draft.payload->>'siteUrl',
                site_domain = draft.payload->>'siteDomain',
                og_title = draft.payload->>'ogTitle',
                og_description = draft.payload->>'ogDescription',
                og_image_url = draft.payload->>'ogImageUrl',
                showcase_image_urls = draft.payload->'showcaseImageUrls',
                tool_pricing = draft.payload->>'pricing',
                latest_version_id = draft.component_version_id,
                review_status = 'approved', review_reason = null,
                reviewed_by = ${actor.id}, reviewed_at = ${now}, updated_at = ${now}
            from draft where component.id = draft.component_id
            returning component.id, draft.component_version_id
          ), recorded as (
            insert into review_records (
              component_id, component_version_id, reviewer_user_id, standard_version,
              decision, checklist, rationale, limitations
            )
            select id, component_version_id, ${actor.id}, ${TOOL_REVIEW_STANDARD_VERSION},
              ${data.decision}, ${JSON.stringify(checked.checklist)}::jsonb,
              ${data.rationale.trim()}, ${TOOL_REVIEW_LIMITATIONS}
            from updated returning component_id
          ), deleted as (
            delete from tool_listing_drafts using recorded
            where tool_listing_drafts.component_id = recorded.component_id
            returning tool_listing_drafts.component_id
          )
          select component_id from deleted
        `)
      : await db.execute(sql`
          with updated as (
            update tool_listing_drafts
            set status = ${draftStatus}, review_reason = ${data.rationale.trim()}, updated_at = ${now}
            where component_id = ${data.componentId} and component_version_id = ${data.componentVersionId} and status = 'pending'
            returning component_id, component_version_id
          ), recorded as (
            insert into review_records (
              component_id, component_version_id, reviewer_user_id, standard_version,
              decision, checklist, rationale, limitations
            )
            select component_id, component_version_id, ${actor.id}, ${TOOL_REVIEW_STANDARD_VERSION},
              ${data.decision}, ${JSON.stringify(checked.checklist)}::jsonb,
              ${data.rationale.trim()}, ${TOOL_REVIEW_LIMITATIONS}
            from updated returning component_id
          )
          select component_id from recorded
        `);
    if (draftResult.rows.length === 0) return { ok: false, error: "This edit is no longer awaiting review." };
    return { ok: true };
  }

  const status = data.decision === "approve" ? "approved" : data.decision === "request-changes" ? "draft" : data.decision === "reject" ? "rejected" : "pending";
  const reason = data.decision === "approve" ? null : data.rationale.trim();
  const result = await db.execute(sql`
    with updated as (
      update components
      set review_status = ${status}, review_reason = ${reason}, reviewed_by = ${actor.id},
          reviewed_at = ${now}, updated_at = ${now}
      where id = ${data.componentId} and latest_version_id = ${data.componentVersionId} and listing_kind = 'tool' and review_status = 'pending'
      returning id, latest_version_id
    ), recorded as (
      insert into review_records (
        component_id, component_version_id, reviewer_user_id, standard_version,
        decision, checklist, rationale, limitations
      )
      select id, latest_version_id, ${actor.id}, ${TOOL_REVIEW_STANDARD_VERSION},
        ${data.decision}, ${JSON.stringify(checked.checklist)}::jsonb,
        ${data.rationale.trim()}, ${TOOL_REVIEW_LIMITATIONS}
      from updated
      returning component_id
    )
    select updated.id from updated inner join recorded on recorded.component_id = updated.id
  `);
  if (result.rows.length === 0) return { ok: false, error: "This tool is no longer awaiting review." };
  return { ok: true };
}
