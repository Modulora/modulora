import { createFileRoute, notFound } from "@tanstack/react-router";
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

function EvidenceBadge({ record }: { record: EvidenceRecord }) {
  const tone =
    record.status === "passed"
      ? "border-emerald-800 text-emerald-400"
      : record.status === "failed"
        ? "border-red-800 text-red-400"
        : "border-border text-muted-foreground";
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <p className="text-sm font-medium">
        {evidenceLabels[record.type] ?? record.type}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {record.scope ?? record.status} ·{" "}
        {new Date(record.timestamp).toLocaleDateString("en-US", {
          dateStyle: "medium",
        })}
      </p>
      {record.limitations ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {record.limitations}
        </p>
      ) : null}
    </div>
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
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold">Commercial component</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Purchase and fulfillment are handled by the creator. Modulora has
            verified the destination domain but has not assessed the source.
          </p>
          <a
            href={item.purchase.url}
            rel="noreferrer"
            className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Purchase on {item.purchase.domain}
            {item.purchase.priceLabel ? ` — ${item.purchase.priceLabel}` : ""}
          </a>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold">Install</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Install this release with the Modulora CLI—or send it to your
            coding agent.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 text-sm">
            <code>{installCommand}</code>
          </pre>
          {item.source ? (
            <p className="mt-3 text-xs text-muted-foreground">
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
        </div>
      )}

      <div>
        <h2 className="font-semibold">Trust evidence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every record names what was checked and its limitations. Evidence is
          scoped to this exact release.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {item.evidence.map((record, i) => (
            <EvidenceBadge key={i} record={record} />
          ))}
        </div>
      </div>
    </div>
  );
}
