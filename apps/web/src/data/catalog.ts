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
  | "hosted-commercial"
  | "external-site";

export type EvidenceType =
  | "publisher-identity"
  | "content-integrity"
  | "install-parity"
  | "domain-verified"
  | "secret-scan"
  | "source-not-assessed"
  | "deprecated"
  | "revoked"
  // reserved for future automated checks:
  | "dependency-scan"
  | "license-scan"
  | "static-analysis"
  | "build-checked"
  | "human-reviewed";

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

export interface ComponentFile {
  /** Target path in the consumer's project. */
  path: string;
  content: string;
}

export interface CatalogItem {
  schemaVersion: "0";
  namespace: string;
  name: string;
  version: string;
  framework: "react" | "web";
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
  /** Stable initial listing creation date. */
  listedAt?: string;
  listingKind?: "component" | "tool";
  site?: {
    url: string;
    domain: string;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
    showcaseImageUrls: string[];
    pricing: "free" | "freemium" | "paid";
  };
  distributionChannels?: DistributionChannel[];
  /** shadcn-style type label (Button, Dialog, …). */
  componentType?: string;
  /** Creator-provided install command for their own registry/CLI. */
  otherCliCommand?: string;
  installCount?: number;
  files?: ComponentFile[];
  evidence: EvidenceRecord[];
  // Marketplace: an active price (minor units) gates the source behind purchase.
  marketplacePrice?: number | null;
  marketplaceLicense?: { name: string; text: string } | null;
  ownedPurchase?: import("../lib/purchases").OwnedComponent | null;
  memberOf?: { name: string; title: string }[];
  inCollection?: string | null;
  /** True when any active paid collection contains this component. */
  inPaidCollection?: boolean;
  /** DB-backed component with real source (live iframe previews). */
  live?: boolean;
  /** Creator-provided install command (their own registry), when set. */
  creatorShadcnCommand?: string;
  // Whether the current viewer may install (owner or paid purchase).
  entitled?: boolean;
  /** Active moderation state, rendered publicly in scoped language when set. */
  moderationState?: "restricted" | "removed" | null;
  /** Latest similarity screen for this release (curator review surface). */
  similarityScreen?: {
    state: "clear" | "potential" | "blocked" | "authorized-derivative";
    candidates: {
      ref: string;
      confidence: string | null;
      files: {
        path: string;
        candidatePath: string;
        score: number;
        /** Curator-only payload used to render the local code comparison. */
        submittedContent?: string;
        candidateContent?: string;
      }[];
    }[];
    corpusLimitation: string;
  } | null;
}

/**
 * Interaction-only previews (canvas + pointer-driven effects) render blank
 * until the pointer moves. Surfaces showing the live sandbox use this to add
 * a dismissable "move your pointer" cue instead of a misleading empty frame.
 */
export function needsInteractionHint(files: ComponentFile[] | undefined): boolean {
  return (files ?? []).some(
    (file) => /canvas/i.test(file.content) && /pointermove|mousemove|onPointerMove/i.test(file.content),
  );
}

/** Commerce display only; licensing and source-model copy remain separate. */
export function isPaidCatalogItem(item: CatalogItem): boolean {
  return (item.sourceModel !== "open-source" && item.sourceModel !== "external-site") || item.marketplacePrice != null || item.inPaidCollection === true;
}

export function formatListingDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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
    files: [
      {
        path: "components/ui/calendar.tsx",
        content: `import * as React from "react"
import { cn } from "@/lib/utils"
import { useCalendar } from "./use-calendar"
import "./calendar.css"

export interface CalendarProps {
  value?: Date
  onChange?: (date: Date) => void
  className?: string
}

export function Calendar({ value, onChange, className }: CalendarProps) {
  const { days, month, year, select, selected } = useCalendar(value)

  return (
    <div className={cn("cal", className)} role="grid" aria-label={\`\${month} \${year}\`}>
      <header className="cal__head">
        <span>{month} {year}</span>
      </header>
      <div className="cal__grid">
        {days.map((day) => (
          <button
            key={day.toISOString()}
            type="button"
            aria-pressed={selected(day)}
            className="cal__day"
            onClick={() => {
              select(day)
              onChange?.(day)
            }}
          >
            {day.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}
`,
      },
      {
        path: "components/ui/use-calendar.ts",
        content: `import * as React from "react"

export function useCalendar(initial?: Date) {
  const [selectedDate, setSelectedDate] = React.useState(initial ?? new Date())
  const view = selectedDate

  const days = React.useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    return Array.from({ length: total }, (_, i) =>
      new Date(first.getFullYear(), first.getMonth(), i + 1),
    )
  }, [view])

  return {
    days,
    month: view.toLocaleString("en", { month: "long" }),
    year: view.getFullYear(),
    selected: (day: Date) => day.toDateString() === selectedDate.toDateString(),
    select: setSelectedDate,
  }
}
`,
      },
      {
        path: "components/ui/calendar.css",
        content: `.cal {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 16rem;
}

.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}

.cal__day {
  aspect-ratio: 1;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  cursor: pointer;
}

.cal__day[aria-pressed="true"] {
  background: var(--foreground);
  color: var(--background);
}
`,
      },
      {
        path: "lib/utils.ts",
        content: `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`,
      },
    ],
    evidence: [
      {
        type: "publisher-identity",
        status: "passed",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:00Z",
        scope: "Published by the authenticated account @northstar.",
        limitations: "Confirms who published this release, not the safety of its code.",
      },
      {
        type: "content-integrity",
        status: "passed",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:05Z",
        toolVersion: "sha256",
        scope: "Install delivers exactly these files — digest sha256:demo…",
        limitations:
          "The Modulora CLI copies files and never runs install scripts; it verifies this digest before writing.",
      },
      {
        type: "secret-scan",
        status: "passed",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:10Z",
        toolVersion: "modulora-secretscan-0.1",
        limitations:
          "Pattern-based scan of published files only; cannot prove the absence of unknown or obfuscated secrets.",
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
      priceLabel: "$49",
    },
    title: "Pro Table",
    description:
      "A virtualized data table with filtering, grouping, and spreadsheet-style editing. Purchased and fulfilled by the creator.",
    category: "Data Display",
    distributionChannels: [],
    evidence: [
      {
        type: "domain-verified",
        status: "passed",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:00Z",
        scope: "DNS TXT record proves control of northstar.dev; the purchase link resolves there.",
        limitations: "Proves control of the domain, not the safety of the delivered source.",
      },
      {
        type: "source-not-assessed",
        status: "asserted",
        issuer: "modulora-platform",
        timestamp: "2026-07-11T18:00:00Z",
        scope:
          "Paid source is fulfilled by the creator and is not available to Modulora.",
        limitations: "Modulora has not received, scanned, or reviewed this source.",
      },
    ],
  },
];

export function findItem(namespace: string, name: string) {
  return catalog.find((c) => c.namespace === namespace && c.name === name);
}
