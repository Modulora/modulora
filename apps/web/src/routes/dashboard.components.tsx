import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { HiSquaresPlus as Blocks, HiArrowTopRightOnSquare as ExternalLink, HiArrowPath as Loader2, HiClipboardDocumentCheck as Review, HiGlobeAlt as Globe, HiMagnifyingGlass as Search, HiPencil as Pencil, HiPlus as Plus, HiSparkles as Sparkles, HiTag as Tag, HiTrash as Trash2 } from "react-icons/hi2";


import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteMyComponent, fetchMyComponents, type MyComponent } from "@/lib/catalog-db";
import { confirmCheckout, setComponentPrice, startPromotion } from "@/lib/marketplace";
import { EarningsBreakdown, LicensePicker, PriceSeal } from "@/components/money";
import { LiveCardPreview } from "@/components/live-card-preview";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { DIRECT_MARKETPLACE_ENABLED } from "@/lib/flags";
import { REVIEW_CHECKS } from "@/lib/review-standard";
import { TOOL_REVIEW_CHECKS } from "@/lib/tool-review-standard";

export const Route = createFileRoute("/dashboard/components")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
  },
  loader: async () => {
    const components = await fetchMyComponents();
    return { components };
  },
  component: MyComponents,
});

function MyComponents() {
  const { components } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [promoted, setPromoted] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | MyComponent["reviewStatus"]>("all");
  const visibleComponents = components.filter((component) => {
    const matchesQuery = `${component.title} ${component.name} ${component.category}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (status === "all" || component.reviewStatus === status);
  });

  // Confirm a returning promotion Checkout, then clean the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sid = new URLSearchParams(window.location.search).get("promo");
    if (!sid) return;
    void confirmCheckout({ data: { sessionId: sid } }).then(() => {
      setPromoted(true);
      window.history.replaceState(null, "", "/dashboard/components");
      void router.invalidate();
    });
  }, [router]);

  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardPageHeader
        title="Listings"
        description={DIRECT_MARKETPLACE_ENABLED ? "Manage your components, tools, pricing, and review state." : "Manage your components, tools, distribution, and review state."}
        action={<Button asChild><Link to="/dashboard/new"><Plus /> New component</Link></Button>}
      />

      {promoted ? (
        <div className="rounded-lg border border-receipt/30 bg-receipt/5 px-4 py-2.5 text-sm text-receipt">
          Promotion active — your component is now featured on browse.
        </div>
      ) : null}

      {components.length === 0 ? (
        <EmptyState
          icon={Blocks}
          title="No listings yet"
          description="Publish a component or list an owner-authorized tool to manage it here."
          action={<Button asChild size="sm"><Link to="/dashboard/new">New component</Link></Button>}
          className="min-h-64 justify-center"
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/35 p-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search listings" className="h-10 bg-background/60 pl-9" />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="h-10 w-full bg-background/60 sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">In review</SelectItem>
                <SelectItem value="approved">Live</SelectItem>
                <SelectItem value="rejected">Changes requested</SelectItem>
              </SelectContent>
            </Select>
            <span className="px-1 text-xs tabular-nums text-muted-foreground">{visibleComponents.length} shown</span>
          </div>

          {visibleComponents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleComponents.map((component) => (
                <ComponentCard key={component.name} component={component} username={user?.username ?? ""} payoutsEnabled={Boolean(user?.payoutsEnabled)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Search} title="No listings match" description="Try another search or review state." className="min-h-64 justify-center" />
          )}
        </>
      )}
    </div>
  );
}

function ReviewBadge({ status }: { status: MyComponent["reviewStatus"] }) {
  const map = {
    draft: { label: "Draft", cls: "bg-secondary text-muted-foreground" },
    approved: { label: "Live", cls: "bg-receipt/10 text-receipt" },
    pending: { label: "In review", cls: "bg-secondary text-foreground" },
    rejected: { label: "Changes requested", cls: "bg-destructive/10 text-destructive" },
  } as const;
  const { label, cls } = map[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

function PriceDialog({ component, payoutsEnabled }: { component: MyComponent; payoutsEnabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dollars, setDollars] = useState(component.marketplacePrice != null ? String(component.marketplacePrice / 100) : "");
  const [licenseTemplate, setLicenseTemplate] = useState<string>("modulora-commercial-v1");
  const [licenseText, setLicenseText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(amount: number | null) {
    setPending(true);
    setError(null);
    const res = await setComponentPrice({ data: { name: component.name, amount, licenseTemplate, licenseText } });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save.");
      return;
    }
    await router.invalidate();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Tag className="size-3.5" />
          {component.marketplacePrice != null ? `$${component.marketplacePrice / 100}` : "Sell"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell {component.title}</DialogTitle>
          <DialogDescription>
            Set a one-time price. Buyers pay through Modulora and get the source + install; you keep 90% of the price (Modulora&apos;s 10% covers our fee and payment processing), paid to your connected account.
          </DialogDescription>
        </DialogHeader>
        {!payoutsEnabled ? (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border/60 bg-secondary/30 p-4">
            <p className="text-sm text-foreground">Connect payouts first — it takes about two minutes, and you keep 90% of every sale.</p>
            <Button asChild size="sm" className="self-start">
              <Link to="/dashboard/earnings" hash="payouts">Set up payouts</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input value={dollars} onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="29" className="h-9" inputMode="decimal" />
            </div>
            <EarningsBreakdown dollars={dollars} />
            <LicensePicker template={licenseTemplate} setTemplate={setLicenseTemplate} text={licenseText} setText={setLicenseText} />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="button" className="flex-1" disabled={pending || !dollars} onClick={() => save(Math.round(parseFloat(dollars) * 100))}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save price
              </Button>
              {component.marketplacePrice != null ? (
                <Button type="button" variant="outline" disabled={pending} onClick={() => save(null)}>Make free</Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const REVIEW_DECISION_LABELS = {
  approve: "Approved",
  "request-changes": "Changes requested",
  reject: "Rejected",
  escalate: "Escalated",
} as const;

function ComponentCard({ component, username, payoutsEnabled }: { component: MyComponent; username: string; payoutsEnabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const matches = confirm.trim().toLowerCase() === component.name.toLowerCase();

  const [promoting, setPromoting] = useState(false);

  async function onDelete() {
    setPending(true);
    await deleteMyComponent({ data: { name: component.name } });
    await router.invalidate();
    setPending(false);
    setOpen(false);
  }

  async function onPromote() {
    setPromoting(true);
    const res = await startPromotion({ data: { name: component.name } });
    if (res.ok && res.url) window.location.href = res.url;
    else setPromoting(false);
  }

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/45 shadow-sm transition-[background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-foreground/15 hover:bg-card/65 hover:shadow-md motion-reduce:transition-none">
      <div className="relative overflow-hidden border-b border-border/60 bg-secondary/20">
        {component.listingKind === "tool" ? (
          <div className="flex aspect-[16/10] w-full items-center justify-center">{component.previewImageUrl ? <img src={component.previewImageUrl} alt="" className="size-full object-cover" /> : <Globe aria-hidden className="size-7 text-muted-foreground/45" />}</div>
        ) : <LiveCardPreview item={{ namespace: username, name: component.name, title: component.title, live: true }} className="w-full rounded-none border-0" />}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <ReviewBadge status={component.reviewStatus} />
          {component.listingKind === "tool" ? <Badge variant="secondary">Tool</Badge> : <PriceSeal paid={component.sourceModel !== "open-source" || (DIRECT_MARKETPLACE_ENABLED && component.marketplacePrice != null)} label={DIRECT_MARKETPLACE_ENABLED && component.marketplacePrice != null ? `$${component.marketplacePrice / 100}` : undefined} />}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="truncate text-base font-semibold">{component.title}</h2><p className="mt-0.5 truncate text-xs text-muted-foreground">{component.category}</p></div>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">v{component.version}</span>
          </div>
          <p className="mt-3 truncate font-mono text-xs text-muted-foreground">@{username}/{component.name}</p>
        </div>
        {component.reviewStatus === "rejected" && component.reviewReason ? (
          <p className="mt-3 line-clamp-2 rounded-lg bg-destructive/8 px-3 py-2 text-xs leading-relaxed text-destructive">{component.reviewReason}</p>
        ) : null}
        {component.reviewHistory.length > 0 ? <ReviewHistoryDialog component={component} /> : <div className="min-h-9" />}

        <div className="mt-auto flex items-center gap-1 border-t border-border/50 pt-3">
        <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
          <Link to="/components/$namespace/$name" params={{ namespace: username, name: component.name }}><ExternalLink className="size-3.5" /> Open</Link>
        </Button>
        {component.listingKind !== "tool" ? <Tooltip><TooltipTrigger asChild><Button asChild variant="ghost" size="icon-sm"><Link to="/dashboard/edit/$name" params={{ name: component.name }} aria-label={`Edit ${component.title}`}><Pencil className="size-3.5" /></Link></Button></TooltipTrigger><TooltipContent>Edit component</TooltipContent></Tooltip> : null}
        {component.reviewStatus === "approved" && component.listingKind !== "tool" ? (
          <>
            {DIRECT_MARKETPLACE_ENABLED ? <PriceDialog component={component} payoutsEnabled={payoutsEnabled} /> : null}
            <Tooltip><TooltipTrigger asChild><Button aria-label={`Promote ${component.title}`} variant="ghost" size="icon-sm" className="holographic-promote-button" disabled={promoting} onClick={onPromote}>{promoting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}</Button></TooltipTrigger><TooltipContent>Promote listing</TooltipContent></Tooltip>
          </>
        ) : null}
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirm(""); }}>
          <Tooltip><TooltipTrigger asChild><DialogTrigger asChild><Button aria-label={`Delete ${component.title}`} variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive"><Trash2 /></Button></DialogTrigger></TooltipTrigger><TooltipContent>Delete listing</TooltipContent></Tooltip>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {component.title}?</DialogTitle>
              <DialogDescription>This permanently removes the {component.listingKind === "tool" ? "tool/site listing" : "component"} @{username}/{component.name} and all its versions. This cannot be undone.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex flex-col gap-3">
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={component.name} autoComplete="off" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              <Button type="button" variant="destructive" disabled={!matches || pending} onClick={onDelete}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Delete listing
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </article>
  );
}

function ReviewHistoryDialog({ component }: { component: MyComponent }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost" size="sm" className="mt-3 self-start gap-1.5 px-2"><Review className="size-3.5" /> Review history · {component.reviewHistory.length}</Button></DialogTrigger>
      <DialogContent className="max-h-[80svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{component.title} review history</DialogTitle><DialogDescription>Append-only decisions and the published checklist used for each review.</DialogDescription></DialogHeader>
        <ol className="mt-4 flex flex-col gap-3">
          {component.reviewHistory.map((record) => (
            <li key={record.id} className="rounded-lg border border-border/60 bg-card/40 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{REVIEW_DECISION_LABELS[record.decision]}</p><p className="text-xs text-muted-foreground">{record.version ? `v${record.version} · ` : ""}{new Date(record.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p></div>
              <p className="mt-3 leading-relaxed">{record.rationale}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Scope: {record.limitations}</p>
              <p className="mt-4 text-xs font-medium">Checklist · {record.standardVersion}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">{(record.standardVersion.startsWith("tool-") ? TOOL_REVIEW_CHECKS : REVIEW_CHECKS).map((check) => {
                const result = record.checklist[check.id] ?? "not recorded";
                const resultClass = result === "pass" ? "text-receipt" : result === "fail" || result === "flag" ? "text-destructive" : "text-muted-foreground";
                return <li key={check.id} className="flex justify-between gap-3 rounded-md bg-secondary/35 px-2.5 py-2 text-xs text-muted-foreground"><span>{check.title}</span><span className={`shrink-0 capitalize ${resultClass}`}>{result.replaceAll("-", " ")}</span></li>;
              })}</ul>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
