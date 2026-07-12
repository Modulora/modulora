/**
 * Report a component (e.g. stolen source, license abuse). Sends a Discord
 * webhook with the reporter's email and the reported component. Requires
 * sign-in so reports are attributable. Never throws into the caller.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getCurrentUser } from "./session";

export const REPORT_REASONS = [
  { id: "stolen", label: "Stolen / uncredited source" },
  { id: "license", label: "License violation" },
  { id: "malicious", label: "Malicious or unsafe code" },
  { id: "impersonation", label: "Impersonation" },
  { id: "other", label: "Something else" },
] as const;

const REASON_IDS = REPORT_REASONS.map((reason) => reason.id);

export interface ReportInput {
  namespace: string;
  name: string;
  reason: string;
  details: string;
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
  }))
  .handler(async ({ data }): Promise<ReportResult> => {
    const request = getRequest();
    if (!request) return { ok: false, error: "No request context." };
    const user = await getCurrentUser(request);
    if (!user) return { ok: false, error: "Sign in to report a component." };

    if (!REASON_IDS.includes(data.reason as (typeof REASON_IDS)[number])) {
      return { ok: false, error: "Choose a reason." };
    }

    const webhookUrl = process.env.REPORT_WEBHOOK_URL;
    if (!webhookUrl) return { ok: false, error: "Reporting is not configured." };

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
                { name: "Reporter", value: user.email, inline: true },
                ...(data.details ? [{ name: "Details", value: data.details }] : []),
              ],
              timestamp: new Date().toISOString(),
              footer: { text: "modulora.dev" },
            },
          ],
        }),
      });
      if (!res.ok) return { ok: false, error: "Could not submit the report." };
    } catch {
      return { ok: false, error: "Could not submit the report." };
    }
    return { ok: true };
  });
