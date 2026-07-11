import { createFileRoute, notFound } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { findItem, type EvidenceRecord } from "../data/catalog";

export const Route = createFileRoute("/components/$namespace/$name")({
  loader: ({ params }) => {
    const item = findItem(params.namespace, params.name);
    if (!item) throw notFound();
    return item;
  },
  component: ComponentDetail,
});

const evidenceLabels: Record<string, string> = {
  "owner-verified": "Owner verified",
  "source-linked": "Source linked",
  "artifact-signed": "Artifact signed",
  "secret-scan": "Secret scan",
  "dependency-scan": "Dependency scan",
  "license-scan": "License scan",
  "static-analysis": "Static analysis",
  "build-checked": "Build checked",
  "human-reviewed": "Human reviewed",
  "source-not-assessed": "Source not assessed",
  deprecated: "Deprecated",
  revoked: "Revoked",
};

function evidenceVariant(status: EvidenceRecord["status"]) {
  if (status === "passed") return "default" as const;
  if (status === "failed") return "destructive" as const;
  return "secondary" as const;
}

function EvidenceCard({ record }: { record: EvidenceRecord }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">
            {evidenceLabels[record.type] ?? record.type}
          </CardTitle>
          <Badge variant={evidenceVariant(record.status)}>{record.status}</Badge>
        </div>
        <CardDescription className="text-xs">
          {record.scope ?? record.issuer} ·{" "}
          {new Date(record.timestamp).toLocaleDateString("en-US", {
            dateStyle: "medium",
          })}
        </CardDescription>
      </CardHeader>
      {record.limitations ? (
        <CardContent className="text-xs text-muted-foreground">
          {record.limitations}
        </CardContent>
      ) : null}
    </Card>
  );
}

function ComponentDetail() {
  const item = Route.useLoaderData();
  const isCommercial = item.sourceModel === "external-commercial";
  const installCommand = `modulora add @${item.namespace}/${item.name}@${item.version}`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">
          @{item.namespace} · v{item.version} · React
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{item.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {item.description}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Created by{" "}
          <span className="text-foreground">{item.owner.identifier}</span>
        </p>
      </div>

      {isCommercial && item.purchase ? (
        <Card>
          <CardHeader>
            <CardTitle>Commercial component</CardTitle>
            <CardDescription>
              Purchase and fulfillment are handled by the creator. Modulora has
              verified the destination domain but has not assessed the source.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={item.purchase.url} rel="noreferrer">
                Purchase on {item.purchase.domain}
                {item.purchase.priceLabel
                  ? ` — ${item.purchase.priceLabel}`
                  : ""}
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Install</CardTitle>
            <CardDescription>
              Install this release with the Modulora CLI—or send it to your
              coding agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <pre className="overflow-x-auto rounded-md bg-background p-3 text-sm">
              <code>{installCommand}</code>
            </pre>
            {item.source ? (
              <p className="text-xs text-muted-foreground">
                Source:{" "}
                <a
                  href={item.source.repository}
                  rel="noreferrer"
                  className="underline hover:text-foreground"
                >
                  {item.source.repository.replace("https://", "")}
                </a>{" "}
                @ {item.source.commit.slice(0, 12)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Separator />

      <div>
        <h2 className="font-semibold">Trust evidence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every record names what was checked and its limitations. Evidence is
          scoped to this exact release.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {item.evidence.map((record, i) => (
            <EvidenceCard key={i} record={record} />
          ))}
        </div>
      </div>
    </div>
  );
}
