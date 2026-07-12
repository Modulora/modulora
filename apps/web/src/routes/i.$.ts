import { createFileRoute } from "@tanstack/react-router";
import { getMediaBucket } from "../lib/media";

async function handle({ params }: { params: { _splat?: string } }) {
  const key = params._splat;
  if (!key) return new Response("Not found", { status: 404 });

  const bucket = getMediaBucket();
  if (!bucket) return new Response("Media storage is not configured", { status: 503 });

  const object = await bucket.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(object.body, { headers });
}

export const Route = createFileRoute("/i/$")({
  server: { handlers: { GET: handle } },
});
