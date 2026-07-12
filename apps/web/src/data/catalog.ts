/**
 * Seed catalog data conforming to @modulora/spec v0 (schemas/v0).
 * This is the vertical-slice stand-in for the database-backed catalog;
 * shapes intentionally mirror modulora-item.schema.json and
 * evidence.schema.json so the swap to real persistence is mechanical.
 */

export type SourceModel =
  | "open-source"
  | "external-commercial"
  | "private-team"
  | "hosted-commercial";

export type EvidenceType =
  | "owner-verified"
  | "source-linked"
  | "artifact-signed"
  | "secret-scan"
  | "dependency-scan"
  | "license-scan"
  | "static-analysis"
  | "build-checked"
  | "human-reviewed"
  | "source-not-assessed"
  | "deprecated"
  | "revoked";

export interface EvidenceRecord {
  type: EvidenceType;
  status: "passed" | "failed" | "warning" | "asserted" | "not-applicable";
  issuer: string;
  timestamp: string;
  scope?: string;
  toolVersion?: string;
  limitations?: string;
}

export type DistributionChannel =
  | "shadcn"
  | "modulora-cli"
  | "compatible-cli";

export interface CatalogItem {
  schemaVersion: "0";
  namespace: string;
  name: string;
  version: string;
  framework: "react";
  sourceModel: SourceModel;
  visibility: "public" | "unlisted" | "private";
  owner: { kind: "user" | "organization"; identifier: string };
  source?: { repository: string; commit: string };
  license:
    | { kind: "spdx"; spdxExpression: string }
    | { kind: "commercial"; url?: string }
    | { kind: "custom"; url?: string };
  purchase?: { url: string; domain: string; priceLabel?: string };
  // Presentation-only fields (not part of the spec manifest):
  title: string;
  description: string;
  category: string;
  distributionChannels?: DistributionChannel[];
  installCount?: number;
  evidence: EvidenceRecord[];
}

export const catalog: CatalogItem[] = [
  {
    schemaVersion: "0",
    namespace: "northstar",
    name: "calendar",
    version: "1.2.0",
    framework: "react",
    sourceModel: "open-source",
    visibility: "public",
    owner: { kind: "organization", identifier: "northstar-ui" },
    source: {
      repository: "https://github.com/northstar-ui/components",
      commit: "b".repeat(40),
    },
    license: { kind: "spdx", spdxExpression: "MIT" },
    title: "Calendar",
    description:
      "An accessible date picker with range selection, keyboard navigation, and timezone-safe defaults.",
    category: "Date & Time",
    distributionChannels: ["shadcn", "modulora-cli", "compatible-cli"],
    evidence: [
      {
        type: "owner-verified",
        status: "passed",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:00Z",
        scope: "GitHub App installation for northstar-ui/components",
      },
      {
        type: "artifact-signed",
        status: "passed",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:05Z",
      },
      {
        type: "secret-scan",
        status: "passed",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:10Z",
        toolVersion: "gitleaks-8.24.0",
        limitations:
          "Pattern-based scan of release files only; cannot prove absence of unknown or obfuscated secrets.",
      },
    ],
  },
  {
    schemaVersion: "0",
    namespace: "northstar",
    name: "pro-table",
    version: "1.2.0",
    framework: "react",
    sourceModel: "external-commercial",
    visibility: "public",
    owner: { kind: "organization", identifier: "northstar-ui" },
    license: { kind: "commercial", url: "https://northstar.dev/license" },
    purchase: {
      url: "https://northstar.dev/pro-table",
      domain: "northstar.dev",
      priceLabel: "$49 one-time",
    },
    title: "Pro Table",
    description:
      "A virtualized data table with filtering, grouping, and spreadsheet-style editing. Purchased and fulfilled by the creator.",
    category: "Data Display",
    distributionChannels: [],
    evidence: [
      {
        type: "owner-verified",
        status: "passed",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:00Z",
        scope: "Domain verification for northstar.dev",
      },
      {
        type: "source-not-assessed",
        status: "asserted",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:00Z",
        scope:
          "Commercial source is not available to Modulora and has not been scanned or reviewed.",
      },
    ],
  },
];

export function findItem(namespace: string, name: string) {
  return catalog.find((c) => c.namespace === namespace && c.name === name);
}
