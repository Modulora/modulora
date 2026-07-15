import { createFileRoute } from "@tanstack/react-router";

import { storeImage } from "../../lib/media";
import { getCurrentUser } from "../../lib/session";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function handle({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
  if (!user) return json({ error: "You must be signed in." }, 401);
  if (!user.isPlus) return json({ error: "Uploading a profile background requires active Modulora Plus." }, 403);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No file provided." }, 400);
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return json({ error: "Use a PNG, JPEG, or WebP image." }, 400);
  }

  const result = await storeImage(`profile-backgrounds/${user.id}`, file);
  if (!result.ok || !result.url) return json({ error: result.error }, 400);
  return json({ url: result.url });
}

export const Route = createFileRoute("/api/upload-profile-background")({
  server: { handlers: { POST: handle } },
});
