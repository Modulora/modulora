/**
 * Owner-gated moderation case handling (#67). Cases are durable, events are
 * append-only, and reporter contact is never exposed publicly. Actions apply
 * scoped listing effects (restriction, takedown, correction, revocation)
 * without ever rewriting history.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { desc, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { isOwnerUser } from "./access";

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

export interface ModerationCaseSummary {
  id: string;
  componentRef: string;
  componentId: string | null;
  reason: string;
  details: string;
  status: string;
  reporter: string;
  reporterContactVerifiedAt: string | null;
  createdAt: string;
  events: { action: string; note: string | null; createdAt: string }[];
}

export const listModerationCases = createServerFn({ method: "GET" }).handler(
  async (): Promise<ModerationCaseSummary[]> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user || !isOwnerUser(user.id)) return [];
    const db = getDb();
    if (!db) return [];

    const cases = await db
      .select()
      .from(schema.moderationCases)
      .orderBy(desc(schema.moderationCases.createdAt))
      .limit(50);
    const events = cases.length
      ? await db.select().from(schema.moderationCaseEvents).orderBy(schema.moderationCaseEvents.createdAt)
      : [];
    return cases.map((row) => ({
      id: row.id,
      componentRef: row.componentRef,
      componentId: row.componentId,
      reason: row.reason,
      details: row.details,
      status: row.status,
      // Owner-only view; reporter contact still never renders publicly.
      reporter: row.reporterEmail,
      reporterContactVerifiedAt: row.reporterContactVerifiedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      events: events
        .filter((event) => event.caseId === row.id)
        .map((event) => ({ action: event.action, note: event.note, createdAt: event.createdAt.toISOString() })),
    }));
  },
);

const ACTIONS = ["noted", "restricted", "takedown", "corrected", "revoked", "appealed", "reopened", "closed"] as const;
export type ModerationAction = (typeof ACTIONS)[number];

const ACTION_STATUS: Partial<Record<ModerationAction, string>> = {
  restricted: "restricted",
  takedown: "takedown",
  corrected: "corrected",
  revoked: "revoked",
  appealed: "appealed",
  reopened: "open",
  closed: "closed",
};

export const actOnModerationCase = createServerFn({ method: "POST" })
  .validator((data: { caseId: string; action: ModerationAction; note: string }) => ({
    caseId: String(data.caseId ?? "").trim(),
    action: String(data.action ?? ""),
    note: String(data.note ?? "").trim().slice(0, 1000),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user || !isOwnerUser(user.id)) return { ok: false, error: "Not authorized." };
    // Never coerce an unknown action into a different one.
    if (!ACTIONS.includes(data.action as ModerationAction)) return { ok: false, error: "Unknown action." };
    const action = data.action as ModerationAction;
    if (!data.note) return { ok: false, error: "A note is required — it becomes the case record." };
    const db = getDb();
    if (!db || !data.caseId) return { ok: false, error: "Invalid request." };

    const [moderationCase] = await db
      .select({ id: schema.moderationCases.id, componentId: schema.moderationCases.componentId })
      .from(schema.moderationCases)
      .where(eq(schema.moderationCases.id, data.caseId))
      .limit(1);
    if (!moderationCase) return { ok: false, error: "Case not found." };

    const nextStatus = ACTION_STATUS[action];
    if (nextStatus) {
      await db
        .update(schema.moderationCases)
        .set({ status: nextStatus as never, updatedAt: new Date() })
        .where(eq(schema.moderationCases.id, data.caseId));
    }
    await db.insert(schema.moderationCaseEvents).values({
      caseId: data.caseId,
      action: action,
      actorUserId: user.id,
      note: data.note,
    });

    // Scoped listing effects.
    if (moderationCase.componentId) {
      if (action === "restricted") {
        await db
          .update(schema.components)
          .set({ moderationState: "restricted", updatedAt: new Date() })
          .where(eq(schema.components.id, moderationCase.componentId));
      } else if (action === "takedown") {
        await db
          .update(schema.components)
          .set({ moderationState: "removed", updatedAt: new Date() })
          .where(eq(schema.components.id, moderationCase.componentId));
      } else if (action === "corrected") {
        await db
          .update(schema.components)
          .set({ moderationState: null, updatedAt: new Date() })
          .where(eq(schema.components.id, moderationCase.componentId));
      } else if (action === "revoked") {
        const [component] = await db
          .select({ latestVersionId: schema.components.latestVersionId })
          .from(schema.components)
          .where(eq(schema.components.id, moderationCase.componentId))
          .limit(1);
        if (component?.latestVersionId) {
          await db
            .update(schema.componentVersions)
            .set({ revokedAt: new Date() })
            .where(eq(schema.componentVersions.id, component.latestVersionId));
        }
        await db
          .update(schema.components)
          .set({ moderationState: "removed", updatedAt: new Date() })
          .where(eq(schema.components.id, moderationCase.componentId));
      }
    }
    return { ok: true };
  });
