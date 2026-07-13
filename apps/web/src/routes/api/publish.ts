/**
 * Authenticated publish API — the endpoint behind `modulora publish`. A thin
 * shell over the exact pipeline the web editor uses (publishCore): same
 * validation, same namespace-ownership enforcement, same curator-review
 * gate. Auth via session cookie or CLI bearer token; policy acceptance is
 * required in the payload just like the editor's checkbox.
 */
import { createFileRoute } from "@tanstack/react-router";
import { publishCore, type PublishInput } from "@/lib/publish";
import { getCurrentUser } from "@/lib/session";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

async function handle({ request }: { request: Request }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Authentication required. Run `modulora login`." }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: Partial<PublishInput>;
  try {
    body = (await request.json()) as Partial<PublishInput>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body." }), { status: 400, headers: JSON_HEADERS });
  }

  const input: PublishInput = {
    name: String(body.name ?? ""),
    title: String(body.title ?? ""),
    description: String(body.description ?? ""),
    category: String(body.category ?? ""),
    version: String(body.version ?? ""),
    pricing: body.pricing === "paid" ? "paid" : "free",
    purchaseUrl: String(body.purchaseUrl ?? ""),
    distributionChannels: Array.isArray(body.distributionChannels)
      ? body.distributionChannels.map(String)
      : ["shadcn", "modulora-cli"],
    shadcnCommand: String(body.shadcnCommand ?? ""),
    otherCliCommand: String(body.otherCliCommand ?? ""),
    originalUrl: String(body.originalUrl ?? ""),
    inspiredBy: Array.isArray(body.inspiredBy) ? body.inspiredBy.map(String) : [],
    files: Array.isArray(body.files)
      ? body.files.map((f) => ({ path: String(f?.path ?? ""), content: String(f?.content ?? "") }))
      : [],
    acceptPolicy: body.acceptPolicy === true,
  };

  const result = await publishCore(input, request);
  return new Response(JSON.stringify(result), { status: result.ok ? 200 : 422, headers: JSON_HEADERS });
}

export const Route = createFileRoute("/api/publish")({
  server: { handlers: { POST: handle } },
});
