/**
 * Report a component (e.g. stolen source, license abuse). Persists a durable
 * moderation case (#67) and notifies the review channel. An account is
 * optional so creators can report impersonation or attribution problems;
 * reporter contact stays private and is never exposed publicly.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";

export const REPORT_REASONS = [
  { id: "stolen", label: "Suspected copied / uncredited source" },
  { id: "license", label: "License violation" },
  { id: "malicious", label: "Malicious or unsafe code" },
  { id: "impersonation", label: "Impersonation" },
  { id: "association", label: "Unauthorized brand association" },
  { id: "other", label: "Something else" },
] as const;

const REASON_IDS = REPORT_REASONS.map((reason) => reason.id);

export function resolveReportContact(accountEmail: string | null | undefined, suppliedEmail: string): string | null {
  const email = (accountEmail ?? suppliedEmail).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export interface ReportInput {
  namespace: string;
  name: string;
  reason: string;
  details: string;
  reporterEmail: string;
}

export interface ReportResult {
  ok: boolean;
  error?: string;
}

export const reportComponent = createServerFn({ method: "POST" })
  .validator((data: ReportInput) => ({
    namespace: String(data.namespace ?? "").trim().slice(0, 64),
    name: String(data.name ?? "").trim().slice(0, 64),
    reason: String(data.reason ?? "").trim(),
    details: String(data.details ?? "").trim().slice(0, 1000),
    reporterEmail: String(data.reporterEmail ?? "").trim().toLowerCase().slice(0, 254),
  }))
  .handler(async ({ data }): Promise<ReportResult> => {
    const request = getRequest();
    if (!request) return { ok: false, error: "No request context." };
    const user = await getCurrentUser(request);
    const reporterEmail = resolveReportContact(user?.email, data.reporterEmail);
    if (!reporterEmail) {
      return { ok: false, error: "Enter a valid contact email." };
    }

    if (!REASON_IDS.includes(data.reason as (typeof REASON_IDS)[number])) {
      return { ok: false, error: "Choose a reason." };
    }

    // Persist the durable case first — the webhook is best-effort notification.
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return { ok: false, error: "Reporting is not configured." };
    const db = drizzle(neon(databaseUrl), { schema });
    const [component] = await db
      .select({ id: schema.components.id })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(and(eq(schema.namespaces.name, data.namespace), eq(schema.components.name, data.name)))
      .limit(1);
    const [moderationCase] = await db
      .insert(schema.moderationCases)
      .values({
        componentId: component?.id ?? null,
        componentRef: `@${data.namespace}/${data.name}`,
        reason: data.reason,
        details: data.details,
        reporterEmail,
        reporterUserId: user?.id ?? null,
      })
      .returning({ id: schema.moderationCases.id });
    if (!moderationCase) return { ok: false, error: "Could not record the report." };
    await db.insert(schema.moderationCaseEvents).values({
      caseId: moderationCase.id,
      action: "opened",
      actorUserId: user?.id ?? null,
      note: null,
    });

    const webhookUrl = process.env.REPORT_WEBHOOK_URL;
    if (!webhookUrl) return { ok: true };

    const label = REPORT_REASONS.find((reason) => reason.id === data.reason)?.label ?? data.reason;
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "Component reported",
              url: `https://modulora.dev/components/${data.namespace}/${data.name}`,
              description: `**@${data.namespace}/${data.name}**\nhttps://modulora.dev/components/${data.namespace}/${data.name}`,
              color: 0xef4444,
              fields: [
                { name: "Reason", value: label, inline: true },
                { name: "Reporter", value: `${reporterEmail}${user ? " (signed in)" : " (no account)"}`, inline: true },
                ...(data.details ? [{ name: "Details", value: data.details }] : []),
              ],
              timestamp: new Date().toISOString(),
              footer: { text: "modulora.dev" },
            },
          ],
        }),
      });
      void res; // The case is already persisted; notification is best-effort.
    } catch {
      // Ignore webhook failures — the durable case is the source of truth.
    }
    return { ok: true };
  });
