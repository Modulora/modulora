/* ─────────────────────────────────────────────────────────
 * COMPONENTS BROWSE — gallery entrance storyboard
 *
 *    0ms   gallery hidden
 *   60ms   taxonomy rail slides in from the left
 *  140ms   toolbar fades in
 *  220ms   preview tiles rise, staggered 50ms
 * ───────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  createStandardSchemaV1,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
  type inferParserType,
} from "nuqs";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon } from "@hugeicons-pro/core-solid-sharp";
import { PriceSeal, PromotedBadge } from "@/components/money";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CalendarDays,
  Gift,
  Tag,
  Clock3,
  Filter,
  Grid2X2,
  List,
  Plus,
  Search,
  Sparkles,
  Table2,
  Users,
  X,
 Component } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveCardPreview } from "@/components/live-card-preview";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchCatalog, fetchFeatured } from "@/lib/catalog-db";
import {
  type CatalogItem,
  type EvidenceType,
  type SourceModel,
} from "../data/catalog";

const SOURCE_MODELS = [
  "open-source",
  "external-commercial",
  "hosted-commercial",
  "private-team",
] as const satisfies readonly SourceModel[];
const LICENSES = ["open", "commercial", "custom"] as const;
const EVIDENCE_FILTERS = [
  "content-integrity",
  "domain-verified",
  "secret-scan",
  "source-not-assessed",
] as const satisfies readonly EvidenceType[];
const PRICES = ["free", "paid"] as const;
const VIEWS = ["featured", "newest", "authors"] as const;
const LAYOUTS = ["grid", "list"] as const;

const catalogSearchParams = {
  q: parseAsString.withDefault(""),
  category: parseAsString,
  type: parseAsString,
  price: parseAsStringLiteral(PRICES),
  source: parseAsStringLiteral(SOURCE_MODELS),
  license: parseAsStringLiteral(LICENSES),
  evidence: parseAsStringLiteral(EVIDENCE_FILTERS),
  view: parseAsStringLiteral(VIEWS).withDefault("newest"),
  layout: parseAsStringLiteral(LAYOUTS).withDefault("grid"),
};

type CatalogSearch = inferParserType<typeof catalogSearchParams>;

export const Route = createFileRoute("/components/")({
  validateSearch: createStandardSchemaV1(catalogSearchParams, {
    partialOutput: true,
  }),
  loader: async () => ({ catalog: await fetchCatalog(), featured: await fetchFeatured() }),
  component: Catalog,
});

const TIMING = { rail: 60, toolbar: 140, tiles: 220 };
const RISE = {
  offsetY: 10,
  stagger: 0.05,
  spring: { type: "spring" as const, stiffness: 340, damping: 29 },
};
const RAIL = {
  offsetX: -10,
  spring: { type: "spring" as const, stiffness: 320, damping: 30 },
};

const SOURCE_OPTIONS: { value: (typeof SOURCE_MODELS)[number]; label: string }[] = [
  { value: "open-source", label: "Open source" },
  { value: "external-commercial", label: "External commercial" },
  { value: "hosted-commercial", label: "Hosted commercial" },
  { value: "private-team", label: "Private team" },
];
const EVIDENCE_OPTIONS: { value: (typeof EVIDENCE_FILTERS)[number]; label: string }[] = [
  { value: "content-integrity", label: "Content integrity" },
  { value: "domain-verified", label: "Domain verified" },
  { value: "secret-scan", label: "Secret scanned" },
];

function Catalog() {
  const { catalog, featured } = Route.useLoaderData();
  const componentTypes = useMemo(
    () => [...new Set(catalog.map((item) => item.componentType).filter((t): t is string => Boolean(t)))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog],
  );
  const categories = useMemo(
    () => [...new Set(catalog.map((item) => item.category))].sort(),
    [catalog],
  );
  const [search, setSearch] = useQueryStates(catalogSearchParams, {
    history: "replace",
    shallow: true,
    clearOnDefault: true,
  });
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), TIMING.rail),
      setTimeout(() => setStage(2), TIMING.toolbar),
      setTimeout(() => setStage(3), TIMING.tiles),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const items = useMemo(() => {
    const filtered = catalog.filter((item) => matches(item, search));
    // Promoted listings sit inline with everything else — first, deduped,
    // marked by the card itself. Paid placement changes position, never trust.
    const promotedKeys = new Set(featured.map((f) => `${f.namespace}/${f.name}`));
    const promoted = filtered.filter((item) => promotedKeys.has(`${item.namespace}/${item.name}`));
    const rest = filtered.filter((item) => !promotedKeys.has(`${item.namespace}/${item.name}`));
    return [...promoted.map((item) => ({ ...item, promoted: true })), ...rest];
  }, [catalog, featured, search],
  );
  const advancedCount = [search.source, search.license, search.evidence].filter(Boolean).length;

  function toggle(
    key: "category" | "type" | "price" | "source" | "license" | "evidence",
    value: string,
  ) {
    void setSearch({ [key]: search[key] === value ? null : value });
  }

  function clear() {
    void setSearch({
      q: null,
      category: null,
      type: null,
      price: null,
      source: null,
      license: null,
      evidence: null,
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <motion.aside
        initial={{ opacity: 0, x: RAIL.offsetX }}
        animate={{ opacity: stage >= 1 ? 1 : 0, x: stage >= 1 ? 0 : RAIL.offsetX }}
        transition={RAIL.spring}
      >
        <div className="sticky top-20 flex flex-col gap-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search.q}
              onChange={(event) => void setSearch({ q: event.target.value })}
              placeholder="Search components"
              className="h-9 bg-secondary/50 pl-9"
            />
          </div>

          <nav className="flex flex-col gap-1">
            <RailButton icon={Sparkles} active={search.view === "featured"} onClick={() => void setSearch({ view: "featured" })}>Featured</RailButton>
            <RailButton icon={Clock3} active={search.view === "newest"} onClick={() => void setSearch({ view: "newest" })}>Newest</RailButton>
            <RailButton icon={Users} active={search.view === "authors"} onClick={() => void setSearch({ view: "authors" })}>Top authors</RailButton>
          </nav>

          <div className="flex flex-col gap-1">
            <RailHeading>Price</RailHeading>
            <RailButton icon={Gift} active={search.price === "free"} onClick={() => toggle("price", "free")}>Free</RailButton>
            <RailButton icon={Tag} active={search.price === "paid"} onClick={() => toggle("price", "paid")}>Paid</RailButton>
          </div>

          <div className="flex flex-col gap-1">
            <RailHeading>Categories</RailHeading>
            {categories.map((category) => (
              <RailButton
                key={category}
                icon={category === "Date & Time" ? CalendarDays : Table2}
                active={search.category === category}
                count={catalog.filter((item) => item.category === category).length}
                onClick={() => toggle("category", category)}
              >
                {category}
              </RailButton>
            ))}
          </div>

          {componentTypes.length > 0 ? (
            <div className="flex flex-col gap-1">
              <RailHeading>Type</RailHeading>
              {componentTypes.map((type) => (
                <RailButton
                  key={type}
                  icon={Component}
                  active={search.type === type}
                  count={catalog.filter((item) => item.componentType === type).length}
                  onClick={() => toggle("type", type)}
                >
                  {type}
                </RailButton>
              ))}
            </div>
          ) : null}

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground">
              <span className="flex items-center gap-2"><Filter className="size-4" /> Advanced filters</span>
              {advancedCount ? <Badge variant="secondary">{advancedCount}</Badge> : null}
            </summary>
            <div className="mt-3 flex flex-col gap-4 pl-2">
              <FilterGroup title="Source">
                {SOURCE_OPTIONS.map((option) => (
                  <SmallFilter key={option.value} active={search.source === option.value} onClick={() => toggle("source", option.value)}>{option.label}</SmallFilter>
                ))}
              </FilterGroup>
              <FilterGroup title="License">
                <SmallFilter active={search.license === "open"} onClick={() => toggle("license", "open")}>Open license</SmallFilter>
                <SmallFilter active={search.license === "commercial"} onClick={() => toggle("license", "commercial")}>Commercial</SmallFilter>
              </FilterGroup>
              <FilterGroup title="Evidence">
                {EVIDENCE_OPTIONS.map((option) => (
                  <SmallFilter key={option.value} active={search.evidence === option.value} onClick={() => toggle("evidence", option.value)}>{option.label}</SmallFilter>
                ))}
              </FilterGroup>
            </div>
          </details>
        </div>
      </motion.aside>

      <section className="flex min-w-0 flex-col gap-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 2 ? 1 : 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Components</span>
            <span className="text-border">/</span>
            <span className="capitalize">{search.view === "authors" ? "Top authors" : search.view}</span>
            {search.category ? <><span className="text-border">/</span><span>{search.category}</span></> : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-muted-foreground">{items.length} result{items.length === 1 ? "" : "s"}</span>
            {(search.q || search.category || advancedCount) ? (
              <button type="button" onClick={clear} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X className="size-3" /> Clear</button>
            ) : null}
            <div className="flex rounded-md border border-border/60 p-0.5">
              <LayoutButton label="Grid" active={search.layout === "grid"} onClick={() => void setSearch({ layout: "grid" })}><Grid2X2 /></LayoutButton>
              <LayoutButton label="List" active={search.layout === "list"} onClick={() => void setSearch({ layout: "list" })}><List /></LayoutButton>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/dashboard/new"><Plus className="size-4" /> Add yours</Link>
            </Button>
          </div>
        </motion.div>

        {items.length ? (
          <div className={search.layout === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>
            {items.map((item, index) => (
              <motion.div
                key={`${item.namespace}/${item.name}`}
                initial={{ opacity: 0, y: RISE.offsetY }}
                animate={{ opacity: stage >= 3 ? 1 : 0, y: stage >= 3 ? 0 : RISE.offsetY }}
                transition={{ ...RISE.spring, delay: index * RISE.stagger }}
              >
                {"promoted" in item && item.promoted ? (
                  <div className="relative rounded-[calc(var(--radius)+2px)] ring-1 ring-border">
                    <PromotedBadge />
                    <GalleryItem item={item} list={search.layout === "list"} />
                  </div>
                ) : (
                  <GalleryItem item={item} list={search.layout === "list"} />
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Filter}
            title="No components match"
            description="Try another category or clear the filters."
            action={<button type="button" onClick={clear} className="text-sm underline underline-offset-4">Clear filters</button>}
            className="min-h-[30rem] justify-center border-0"
          />
        )}
      </section>
    </div>
  );
}

function GalleryItem({ item, list }: { item: CatalogItem; list: boolean }) {
  return (
    <Link
      to="/components/$namespace/$name"
      params={{ namespace: item.namespace, name: item.name }}
      className={`group flex overflow-hidden rounded-xl border border-border/60 bg-card/40 transition-colors hover:border-foreground/20 hover:bg-card/70 ${list ? "items-center gap-5 p-3" : "flex-col p-3"}`}
    >
      <LiveCardPreview item={item} className={list ? "w-56 shrink-0" : "w-full"} />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3 px-1 pb-1 pt-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-sm font-medium">{item.title}</h2>
            <EvidenceMark evidence={item.evidence} />
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">by {item.namespace}{item.inCollection ? ` in ${item.inCollection}` : ""} · {item.category}</p>
        </div>
        <PriceSeal paid={item.sourceModel !== "open-source"} label={item.sourceModel === "open-source" ? "Free" : item.purchase?.priceLabel ?? "Paid"} />
      </div>
    </Link>
  );
}

/**
 * The card check-mark, explained on hover. Scoped evidence only — the
 * popover lists exactly which records back the mark, never a generic
 * "verified".
 */
const EVIDENCE_LABELS: Record<string, string> = {
  "publisher-identity": "Publisher identity — published by the authenticated account",
  "content-integrity": "Content integrity — installs deliver exactly the hashed files",
  "install-parity": "Install parity — external command output matches the upload",
  "domain-verified": "Domain verified — creator proved control via DNS",
  "secret-scan": "Secret scan — published files scanned for credential patterns",
};

function EvidenceMark({ evidence }: { evidence: { type: string; status: string }[] }) {
  const backing = evidence.filter((r) => r.status === "passed" && EVIDENCE_LABELS[r.type]);
  if (!backing.some((r) => r.type === "content-integrity" || r.type === "domain-verified")) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="text-receipt"
          // A hover target inside the card link: explain, don't navigate.
          onClick={(e) => e.preventDefault()}
        >
          <HugeiconsIcon icon={CheckmarkBadge01Icon} size={14} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72">
        <p className="mb-1 font-medium">Scoped evidence — not an endorsement</p>
        <ul className="flex list-disc flex-col gap-0.5 pl-4 text-left">
          {backing.map((r) => (
            <li key={r.type}>{EVIDENCE_LABELS[r.type]}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function RailHeading({ children }: { children: ReactNode }) {
  return <span className="px-2 pb-1 text-xs font-medium text-muted-foreground/60">{children}</span>;
}

function RailButton({ icon: Icon, active, count, onClick, children }: { icon: typeof Sparkles; active: boolean; count?: number; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}>
      <Icon className="size-4 shrink-0" /><span className="flex-1 truncate">{children}</span>{typeof count === "number" ? <span className="text-xs tabular-nums opacity-60">{count}</span> : null}
    </button>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="flex flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">{title}</span>{children}</div>;
}

function SmallFilter({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`flex items-center gap-2 py-1 text-left text-xs ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}><span className={`size-1.5 rounded-full ${active ? "bg-foreground" : "bg-border"}`} />{children}</button>;
}

function LayoutButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} aria-pressed={active} onClick={onClick} className={`flex size-7 items-center justify-center rounded [&_svg]:size-3.5 ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{children}</button>;
}

/** Any query/filter active — we hide the Featured row in filtered views. */
function hasActiveSearch(search: CatalogSearch): boolean {
  return Boolean(
    search.q.trim() ||
      search.category ||
      search.price ||
      search.source ||
      search.license ||
      search.evidence ||
      (search.view && search.view !== "newest"),
  );
}

function matches(item: CatalogItem, search: CatalogSearch) {
  if (search.q) {
    const haystack = `${item.namespace} ${item.name} ${item.title} ${item.description}`.toLowerCase();
    if (!haystack.includes(search.q.toLowerCase())) return false;
  }
  if (search.category && item.category !== search.category) return false;
  if (search.type && item.componentType !== search.type) return false;
  if (search.price) {
    const isFree = item.sourceModel === "open-source";
    if (search.price === "free" && !isFree) return false;
    if (search.price === "paid" && isFree) return false;
  }
  if (search.source && item.sourceModel !== search.source) return false;
  if (search.license) {
    const license = item.license.kind === "spdx" ? "open" : item.license.kind;
    if (license !== search.license) return false;
  }
  if (search.evidence && !item.evidence.some((record) => record.type === search.evidence)) return false;
  return true;
}
