import { createFileRoute } from "@tanstack/react-router";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { schema } from "@modulora/db";
import { consumeReporterContactToken, reporterContactTokenIsValid } from "../../../lib/report-contact";

const headers = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
};

function page(title: string, message: string, action = "", status = 200): Response {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Modulora</title><style>html{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#09090b;color:#fafafa;font:16px/1.5 system-ui,sans-serif}.card{width:min(36rem,calc(100% - 3rem));padding:2rem;border:1px solid #27272a;border-radius:1rem;background:#0c0c0e}p{color:#a1a1aa}a{color:#fafafa}button{min-height:44px;padding:.6rem 1rem;border:1px solid #3f3f46;border-radius:.6rem;background:#fafafa;color:#09090b;font:inherit;font-weight:600;cursor:pointer}</style><main class="card"><strong>MODULORA</strong><h1>${title}</h1><p>${message}</p>${action || '<a href="https://modulora.dev">Return to Modulora</a>'}</main></html>`,
    { status, headers },
  );
}

function unavailable(): Response {
  return page("Confirmation link unavailable", "This link is invalid, expired, or already used.", "", 400);
}

export async function showReporterContactConfirmation({ request }: { request: Request }): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!reporterContactTokenIsValid(token)) return unavailable();
  return page(
    "Confirm this contact address",
    "Your report is already recorded. Confirm only if you submitted it and want the moderation team to use this address for case follow-up.",
    `<form method="post"><input type="hidden" name="token" value="${token}"><button type="submit">Confirm contact address</button></form>`,
  );
}

async function consumeConfirmation({ request }: { request: Request }): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return unavailable();
  }
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  if (!reporterContactTokenIsValid(token)) return unavailable();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return page("Confirmation unavailable", "Try again later.", "", 503);
  const db = drizzle(neon(databaseUrl), { schema });
  if (!(await consumeReporterContactToken(db, token))) return unavailable();
  return page(
    "Contact confirmed",
    "Your report was already recorded. The moderation team can now treat this address as a confirmed way to contact you about this case.",
  );
}

export const Route = createFileRoute("/api/report-contact/verify")({
  server: { handlers: { GET: showReporterContactConfirmation, POST: consumeConfirmation } },
});
