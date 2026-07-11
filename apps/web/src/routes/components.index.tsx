import { createFileRoute, Link } from "@tanstack/react-router";
import { catalog } from "../data/catalog";

export const Route = createFileRoute("/components/")({ component: Catalog });

function Catalog() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Components</h1>
        <p className="mt-1 text-muted-foreground">
          {catalog.length} creator-authorized components
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {catalog.map((item) => (
          <Link
            key={`${item.namespace}/${item.name}`}
            to="/components/$namespace/$name"
            params={{ namespace: item.namespace, name: item.name }}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-muted-foreground/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{item.title}</h2>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {item.sourceModel === "open-source"
                  ? item.license.kind === "spdx"
                    ? item.license.spdxExpression
                    : "Open"
                  : "Commercial"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.description}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              @{item.namespace} · v{item.version} · {item.category}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
