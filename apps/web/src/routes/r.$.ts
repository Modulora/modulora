/**
 * Registry endpoint: serves a component as shadcn registry-item JSON.
 *   shadcn add https://modulora.dev/r/@user/name
 *   shadcn add https://modulora.dev/r/@user/name@0.1.0
 */
import { createFileRoute } from "@tanstack/react-router";
import { parseRegistryPath, resolveRegistryItem } from "@/lib/registry";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=60",
};

async function handle({ params }: { params: { _splat?: string } }) {
  const splat = params._splat;
  if (!splat) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: JSON_HEADERS });

  const parsed = parseRegistryPath(splat);
  if (!parsed) {
    return new Response(JSON.stringify({ error: "Invalid registry path" }), { status: 400, headers: JSON_HEADERS });
  }

  const item = await resolveRegistryItem(parsed);
  if (!item) {
    return new Response(JSON.stringify({ error: "Component not found" }), { status: 404, headers: JSON_HEADERS });
  }

  return new Response(JSON.stringify(item, null, 2), { headers: JSON_HEADERS });
}

export const Route = createFileRoute("/r/$")({
  server: { handlers: { GET: handle } },
});
