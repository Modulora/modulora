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
import { emailReportContactVerification } from "./email";
import { createReporterContactToken } from "./report-contact";
import { consumeReportRateLimit } from "./report-rate-limit";

export const REPORT_REASONS = [
  { id: "stolen", label: "Suspected copied / uncredited source" },
  { id: "license", label: "License violation" },
  { id: "malicious", label: "Malicious or unsafe code" },
  { id: "impersonation", label: "Impersonation" },
  { id: "association", label: "Unauthorized brand association" },
  { id: "other", label: "Something else" },
] as const;

const REASON_IDS = REPORT_REASONS.map((reason) => reason.id);
const REPORT_REF_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export function reportRefPartIsValid(value: string): boolean {
  return REPORT_REF_PATTERN.test(value);
}

export function resolveReportContact(accountEmail: string | null | undefined, suppliedEmail: string): string | null {
  const email = (accountEmail ?? suppliedEmail).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function createReportWebhookPayload(componentRef: string, reasonLabel: string) {
  return {
    embeds: [
      {
        title: "Component reported",
        url: `https://modulora.dev/components/${componentRef.slice(1)}`,
        description: `**${componentRef}**\nhttps://modulora.dev/components/${componentRef.slice(1)}`,
        color: 0xef4444,
        fields: [
          { name: "Reason", value: reasonLabel, inline: true },
          { name: "Reporter contact", value: "Private; confirmation pending", inline: true },
          { name: "Case evidence", value: "Private; open the owner-only moderation case", inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "modulora.dev" },
      },
    ],
  };
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
  code?: "RATE_LIMITED";
  contactVerificationRequired?: boolean;
}

export const reportComponent = createServerFn({ method: "POST" })
  .validator((data: ReportInput) => ({
    namespace: String(data.namespace ?? "").trim().toLowerCase(),
    name: String(data.name ?? "").trim().toLowerCase(),
    reason: String(data.reason ?? "").trim(),
    details: String(data.details ?? "").trim().slice(0, 1000),
    reporterEmail: String(data.reporterEmail ?? "").trim().toLowerCase().slice(0, 254),
  }))
  .handler(async ({ data }): Promise<ReportResult> => {
    const request = getRequest();
    if (!request) return { ok: false, error: "No request context." };
    const user = await getCurrentUser(request);
    if (!(await consumeReportRateLimit(request, user?.id))) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        error: "Too many reports from this address. Try again in one minute.",
      };
    }
    const reporterEmail = resolveReportContact(user?.email, data.reporterEmail);
    if (!reporterEmail) {
      return { ok: false, error: "Enter a valid contact email." };
    }

    if (!REASON_IDS.includes(data.reason as (typeof REASON_IDS)[number])) {
      return { ok: false, error: "Choose a reason." };
    }
    if (!reportRefPartIsValid(data.namespace) || !reportRefPartIsValid(data.name)) {
      return { ok: false, error: "Component not found." };
    }

    // Persist the durable case first — the webhook is best-effort notification.
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return { ok: false, error: "Reporting is not configured." };
    const db = drizzle(neon(databaseUrl), { schema });
    const [component] = await db
      .select({ id: schema.components.id, namespace: schema.namespaces.name, name: schema.components.name })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(and(eq(schema.namespaces.name, data.namespace), eq(schema.components.name, data.name)))
      .limit(1);
    if (!component) return { ok: false, error: "Component not found." };
    const componentRef = `@${component.namespace}/${component.name}`;
    const contactToken = await createReporterContactToken();
    const [moderationCase] = await db
      .insert(schema.moderationCases)
      .values({
        componentId: component.id,
        componentRef,
        reason: data.reason,
        details: data.details,
        reporterEmail,
        reporterUserId: user?.id ?? null,
        reporterContactTokenHash: contactToken.tokenHash,
        reporterContactTokenExpiresAt: contactToken.expiresAt,
      })
      .returning({ id: schema.moderationCases.id });
    if (!moderationCase) return { ok: false, error: "Could not record the report." };
    await db.insert(schema.moderationCaseEvents).values({
      caseId: moderationCase.id,
      action: "opened",
      actorUserId: user?.id ?? null,
      note: null,
    });

    // Await the case-specific opt-in email. Workers may cancel dangling
    // promises after the request returns. Email failure never deletes the case.
    await emailReportContactVerification(
      reporterEmail,
      componentRef,
      contactToken.token,
    );

    const webhookUrl = process.env.REPORT_WEBHOOK_URL;
    if (!webhookUrl) return { ok: true, contactVerificationRequired: true };

    const label = REPORT_REASONS.find((reason) => reason.id === data.reason)?.label ?? data.reason;
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createReportWebhookPayload(componentRef, label)),
      });
      void res; // The case is already persisted; notification is best-effort.
    } catch {
      // Ignore webhook failures — the durable case is the source of truth.
    }
    return { ok: true, contactVerificationRequired: true };
  });
