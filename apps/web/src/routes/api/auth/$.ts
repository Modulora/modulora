import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "../../../lib/auth";

function handle({ request }: { request: Request }) {
  const auth = getAuth();
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "authentication is not configured" }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
