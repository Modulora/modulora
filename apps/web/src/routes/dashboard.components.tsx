import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { HiSquaresPlus as Blocks, HiArrowTopRightOnSquare as ExternalLink, HiArrowPath as Loader2, HiPencil as Pencil, HiPlus as Plus, HiSparkles as Sparkles, HiTag as Tag, HiTrash as Trash2 } from "react-icons/hi2";


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
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <DashboardPageHeader
        title="Components"
        description={DIRECT_MARKETPLACE_ENABLED ? "Edit, price, promote, or remove what you've published." : "Edit, distribute, promote, or remove what you've published."}
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
          title="No components yet"
          description="Publish your first component to manage its review, pricing, and distribution here."
          action={<Button asChild size="sm"><Link to="/dashboard/new">New component</Link></Button>}
          className="min-h-64 justify-center"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {components.map((component) => (
            <ComponentRow key={component.name} component={component} username={user?.username ?? ""} payoutsEnabled={Boolean(user?.payoutsEnabled)} />
          ))}
        </div>
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
              <Link to="/dashboard/payouts">Set up payouts</Link>
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

function ComponentRow({ component, username, payoutsEnabled }: { component: MyComponent; username: string; payoutsEnabled: boolean }) {
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
    <div className="flex flex-col items-stretch gap-3 rounded-xl border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:gap-4">
      {component.listingKind === "tool" ? (
        <div className="hidden aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-secondary/30 sm:block">{component.previewImageUrl ? <img src={component.previewImageUrl} alt="" className="size-full object-cover" /> : null}</div>
      ) : <LiveCardPreview item={{ namespace: username, name: component.name, title: component.title, live: true }} className="w-28 shrink-0 max-sm:hidden" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate font-medium">{component.title}</h2>
          {component.listingKind === "tool" ? <Badge variant="outline">Tool</Badge> : <PriceSeal paid={component.sourceModel !== "open-source" || (DIRECT_MARKETPLACE_ENABLED && component.marketplacePrice != null)} label={DIRECT_MARKETPLACE_ENABLED && component.marketplacePrice != null ? `$${component.marketplacePrice / 100}` : undefined} />}
          <ReviewBadge status={component.reviewStatus} />
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">@{username}/{component.name}@{component.version} · {component.category}</p>
        {component.reviewStatus === "rejected" && component.reviewReason ? (
          <p className="mt-1 line-clamp-2 text-xs text-destructive">Changes requested: {component.reviewReason}</p>
        ) : null}
        {component.reviewHistory.length > 0 ? (
          <details className="mt-2 rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-xs">
            <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              Review history ({component.reviewHistory.length})
            </summary>
            <ol className="flex flex-col gap-3 border-t border-border/40 py-3">
              {component.reviewHistory.map((record) => (
                <li key={record.id} className="rounded-md border border-border/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{REVIEW_DECISION_LABELS[record.decision]}</p>
                    <p className="text-muted-foreground">{record.version ? `v${record.version} · ` : ""}{new Date(record.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  <p className="mt-2 leading-relaxed">{record.rationale}</p>
                  <p className="mt-2 leading-relaxed text-muted-foreground">Scope: {record.limitations}</p>
                  <p className="mt-2 font-medium">Checklist · {record.standardVersion}</p>
                  <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                    {(record.standardVersion.startsWith("tool-") ? TOOL_REVIEW_CHECKS : REVIEW_CHECKS).map((check) => (
                      <li key={check.id} className="flex justify-between gap-2 text-muted-foreground">
                        <span>{check.title}</span>
                        <span className="shrink-0 capitalize">{(record.checklist[check.id] ?? "not recorded").replace("-", " ")}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1 border-t border-border/50 pt-2 sm:shrink-0 sm:border-0 sm:pt-0">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/components/$namespace/$name" params={{ namespace: username, name: component.name }}><ExternalLink className="size-3.5" /> View</Link>
        </Button>
        {component.listingKind !== "tool" ? <Button asChild variant="ghost" size="sm" className="gap-1.5"><Link to="/dashboard/edit/$name" params={{ name: component.name }}><Pencil className="size-3.5" /> Edit</Link></Button> : null}
        {component.reviewStatus === "approved" && component.listingKind !== "tool" ? (
          <>
            {DIRECT_MARKETPLACE_ENABLED ? <PriceDialog component={component} payoutsEnabled={payoutsEnabled} /> : null}
            <Button variant="ghost" size="sm" className="gap-1.5" disabled={promoting} onClick={onPromote}>
              {promoting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Promote
            </Button>
          </>
        ) : null}
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirm(""); }}>
          <DialogTrigger asChild>
            <Button aria-label={`Delete ${component.title}`} variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 /></Button>
          </DialogTrigger>
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
  );
}
