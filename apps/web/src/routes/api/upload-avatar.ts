import { createFileRoute } from "@tanstack/react-router";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "../../lib/session";
import { storeImage } from "../../lib/media";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function handle({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
  if (!user) return json({ error: "You must be signed in." }, 401);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No file provided." }, 400);

  const result = await storeImage(`avatars/${user.id}`, file);
  if (!result.ok || !result.url) return json({ error: result.error }, 400);

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const db = drizzle(neon(databaseUrl), { schema });
    await db
      .update(schema.users)
      .set({ image: result.url, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));
  }

  return json({ url: result.url });
}

export const Route = createFileRoute("/api/upload-avatar")({
  server: { handlers: { POST: handle } },
});
