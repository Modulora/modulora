import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
          >
            <Card className="h-full transition-colors hover:border-muted-foreground/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{item.title}</CardTitle>
                  <Badge variant="outline">
                    {item.sourceModel === "open-source"
                      ? item.license.kind === "spdx"
                        ? item.license.spdxExpression
                        : "Open"
                      : "Commercial"}
                  </Badge>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground">
                @{item.namespace} · v{item.version} · {item.category}
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
