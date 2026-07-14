import { createFileRoute } from "@tanstack/react-router";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { activeInvitationFor, clearInvitationCookie, invitationCookie, invitationForToken } from "@/lib/invitation-core";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

async function handle({ request }: { request: Request }) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response(JSON.stringify({ ok: false, error: "Setup is unavailable." }), {
      status: 503,
      headers: JSON_HEADERS,
    });
  }
  let token = "";
  try {
    const body = (await request.json()) as { token?: string };
    token = String(body.token ?? "");
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid request." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
  const db = drizzle(neon(databaseUrl), { schema });
  const invitation = await invitationForToken(db, token);
  if (!invitation || !(await activeInvitationFor(db, token))) {
    return new Response(JSON.stringify({ ok: false, error: "This invitation is invalid or no longer active." }), {
      status: 410,
      headers: JSON_HEADERS,
    });
  }
  // Possession of the emailed bearer link verifies control of the invited
  // address. This lets Better Auth safely link GitHub to an existing local
  // credential account without weakening linking for unrelated accounts.
  await db
    .update(schema.users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(schema.users.email, invitation.email));
  const headers = new Headers(JSON_HEADERS);
  headers.set("set-cookie", invitationCookie(token, invitation.expiresAt, new URL(request.url).protocol === "https:"));
  return new Response(JSON.stringify({ ok: true, email: invitation.email }), { headers });
}

async function clear({ request }: { request: Request }) {
  const headers = new Headers(JSON_HEADERS);
  headers.set("set-cookie", clearInvitationCookie(new URL(request.url).protocol === "https:"));
  return new Response(JSON.stringify({ ok: true }), { headers });
}

export const Route = createFileRoute("/api/invitations/prepare")({
  server: { handlers: { POST: handle, DELETE: clear } },
});
