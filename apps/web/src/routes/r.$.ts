/**
 * Registry endpoint: serves a component as shadcn registry-item JSON.
 *   shadcn add https://modulora.dev/r/@user/name
 *   shadcn add https://modulora.dev/r/@user/name@0.1.0
 */
import { createFileRoute } from "@tanstack/react-router";
import { parseRegistryPath, resolveRegistryItem } from "@/lib/registry";
import { alphaGateActive } from "@/lib/access";
import { getCurrentUser } from "@/lib/session";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=60",
};

async function handle({ params, request }: { params: { _splat?: string }; request: Request }) {
  // Closed alpha: registry access requires an authenticated (allowlisted)
  // account — session cookie or CLI bearer token. No gate once launched.
  if (alphaGateActive() && !(await getCurrentUser(request))) {
    return new Response(JSON.stringify({ error: "Authentication required during the alpha. Run `modulora login`." }), {
      status: 401,
      headers: { ...JSON_HEADERS, "cache-control": "no-store" },
    });
  }
  const splat = params._splat;
  if (!splat) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: JSON_HEADERS });

  const parsed = parseRegistryPath(splat);
  if (!parsed) {
    return new Response(JSON.stringify({ error: "Invalid registry path" }), { status: 400, headers: JSON_HEADERS });
  }

  const result = await resolveRegistryItem(parsed, request);
  if (result.status === "payment-required") {
    // Paid listing without an entitlement: point at the purchase page. Never cache.
    return new Response(
      JSON.stringify({
        error: "Payment required",
        message: "This component is sold on Modulora. Buy it, then sign in with `modulora login` to install.",
        price: result.price,
        currency: result.currency,
        purchase_url: `https://modulora.dev/components/${parsed.namespace}/${parsed.name}`,
      }),
      { status: 402, headers: { ...JSON_HEADERS, "cache-control": "no-store" } },
    );
  }
  if (result.status === "not-found") {
    return new Response(JSON.stringify({ error: "Component not found" }), { status: 404, headers: JSON_HEADERS });
  }

  // Entitlement-gated responses must never hit shared caches; free stays cacheable.
  const headers = result.gated ? { ...JSON_HEADERS, "cache-control": "private, no-store" } : JSON_HEADERS;
  return new Response(JSON.stringify(result.item, null, 2), { headers });
}

export const Route = createFileRoute("/r/$")({
  server: { handlers: { GET: handle } },
});
