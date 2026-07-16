/**
 * Bare live preview — just the sandbox, no chrome. Embedded as a lazy
 * iframe by browse/profile cards (#53) so list pages stay light: each card
 * loads its own files only when scrolled into view. Same-origin, so the
 * alpha gate and entitlements apply exactly as everywhere else.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ComponentSandbox } from "@/components/component-sandbox";
import { fetchCatalogDetail } from "@/lib/catalog-db";

export const Route = createFileRoute("/preview/$namespace/$name")({
  validateSearch: (search: Record<string, unknown>) => ({
    theme: search.theme === "light" ? ("light" as const) : ("dark" as const),
  }),
  loader: async ({ params }) => {
    const item = await fetchCatalogDetail({ data: { namespace: params.namespace, name: params.name } });
    if (!item) throw notFound();
    return { item };
  },
  component: PreviewPage,
});

function PreviewPage() {
  const { item } = Route.useLoaderData();
  const { theme } = Route.useSearch();
  const files = item.files ?? [];
  const demoPath = files.find((f) => f.path.startsWith("src/demos/"))?.path ?? "src/demos/default.tsx";

  if (files.length === 0) {
    // No source, or a paid preview build could not be produced (fail closed).
    return (
      <div className="flex h-svh items-center justify-center bg-[#0d0d0d] text-xs text-muted-foreground">
        Preview unavailable
      </div>
    );
  }

  return (
    <ComponentSandbox
      files={files.map((f) => ({ path: f.path, content: f.content }))}
      selectedDemo={demoPath}
      theme={theme}
      className="h-svh"
    />
  );
}
