/**
 * Collections — group your components into installable kits. One install
 * command pulls every member, each digest-verified individually.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  HiArrowPath as Loader2,
  HiArrowTopRightOnSquare as ExternalLink,
  HiCheckCircle as CheckCircle,
  HiMagnifyingGlass as Search,
  HiPlus as Plus,
  HiSquare3Stack3D as Layers,
  HiTrash as Trash2,
} from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteCollection, fetchMyCollections, saveCollection, type MyCollection } from "@/lib/collections";
import { fetchMyComponents } from "@/lib/catalog-db";
import { setCollectionExternalUrl, setCollectionPrice } from "@/lib/marketplace";
import { getPayoutStatus } from "@/lib/payouts";
import { EarningsBreakdown, LicensePicker, PriceSeal } from "@/components/money";
import { DIRECT_MARKETPLACE_ENABLED } from "@/lib/flags";
import { EXTERNAL_DOMAIN_VERIFICATION_REQUIRED } from "@/lib/flags";

export const Route = createFileRoute("/dashboard/collections")({
  loader: async () => ({
    collections: await fetchMyCollections(),
    components: (await fetchMyComponents()).filter((item) => item.listingKind === "component"),
    payouts: await getPayoutStatus(),
  }),
  component: CollectionsPage,
});

type SaleFilter = "all" | "free" | "for-sale";

function CollectionsPage() {
  const { collections, components, payouts } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const username = user?.username ?? null;
  const eligible = useMemo(() => components.map((component) => ({ name: component.name, title: component.title })), [components]);
  const [query, setQuery] = useState("");
  const [saleFilter, setSaleFilter] = useState<SaleFilter>("all");

  const stats = useMemo(() => ({
    collections: collections.length,
    entries: collections.reduce((total, collection) => total + collection.items.length, 0),
    live: collections.reduce((total, collection) => total + collection.items.filter((item) => item.reviewStatus === "approved").length, 0),
    forSale: collections.filter((collection) => collection.price != null || collection.externalUrl).length,
  }), [collections]);

  const filteredCollections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return collections.filter((collection) => {
      const forSale = collection.price != null || Boolean(collection.externalUrl);
      if (saleFilter === "free" && forSale) return false;
      if (saleFilter === "for-sale" && !forSale) return false;
      if (!normalizedQuery) return true;
      return collection.title.toLowerCase().includes(normalizedQuery)
        || collection.name.toLowerCase().includes(normalizedQuery)
        || collection.description.toLowerCase().includes(normalizedQuery)
        || collection.items.some((item) => item.title.toLowerCase().includes(normalizedQuery) || item.name.includes(normalizedQuery));
    });
  }, [collections, query, saleFilter]);

  return (
    <div className="w-full">
      <DashboardPageHeader
        title="Collections"
        description="Compile your components into installable kits — one command installs every member, each digest-verified individually. For example, an entire shadcn registry may be compiled into a collection. Only approved, public members serve."
        action={<CollectionDialog eligible={eligible} />}
      />

      <section aria-label="Collection summary" className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-border/60 bg-card/35 lg:grid-cols-4">
        <CollectionStat label="Collections" value={stats.collections} className="border-b border-r lg:border-b-0" />
        <CollectionStat label="Component entries" value={stats.entries} className="border-b lg:border-b-0 lg:border-r" />
        <CollectionStat label="Live entries" value={stats.live} className="border-r" />
        <CollectionStat label="For sale" value={stats.forSale} />
      </section>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border/60 bg-card/30 p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search collections and components" aria-label="Search collections and components" className="pl-9" />
        </div>
        <Select value={saleFilter} onValueChange={(value) => setSaleFilter(value as SaleFilter)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter collections by sale status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All collections</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="for-sale">For sale</SelectItem>
          </SelectContent>
        </Select>
        <span className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground">{filteredCollections.length} {filteredCollections.length === 1 ? "collection" : "collections"} shown</span>
      </div>

      {collections.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Create your first collection"
          description="Compile a dashboard kit, marketing system, or complete shadcn registry into one installable collection."
          action={<CollectionDialog eligible={eligible} />}
          className="mt-6 min-h-64"
        />
      ) : filteredCollections.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching collections"
          description="Try another search or sale-status filter."
          action={<Button variant="outline" size="sm" onClick={() => { setQuery(""); setSaleFilter("all"); }}>Clear filters</Button>}
          className="mt-6 min-h-48"
        />
      ) : (
        <section aria-label="Your collections" className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredCollections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              eligible={eligible}
              payoutsEnabled={payouts.payoutsEnabled}
              username={username}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function CollectionStat({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className={`border-border/60 p-4 ${className}`}>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function CollectionCard({ collection, eligible, payoutsEnabled, username }: { collection: MyCollection; eligible: { name: string; title: string }[]; payoutsEnabled: boolean; username: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveCount = collection.items.filter((item) => item.reviewStatus === "approved").length;
  const paid = collection.price != null || Boolean(collection.externalUrl);

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      const result = await deleteCollection({ data: { name: collection.name } });
      if (!result.ok) { setError(result.error ?? "Could not delete this collection."); return; }
      setDeleteOpen(false);
      await router.invalidate();
    } catch {
      setError("Could not delete this collection. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="flex min-h-80 min-w-0 flex-col rounded-xl border border-border/60 bg-card/40 p-4 transition-[background-color,border-color,box-shadow] duration-150 hover:border-foreground/15 hover:bg-card/60 hover:shadow-sm motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground"><Layers className="size-4" /></span>
        <PriceSeal paid={paid} label={collection.price != null ? `$${collection.price / 100}` : collection.externalUrl ? "External" : undefined} />
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="truncate text-base font-semibold">{collection.title}</h2>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{collection.items.length} {collection.items.length === 1 ? "component" : "components"}</span>
        </div>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">@{username ?? "you"}/{collection.name}</p>
        {collection.description ? <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{collection.description}</p> : null}
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-1.5 rounded-lg border border-border/50 bg-background/25 p-2">
        {collection.items.slice(0, 4).map((item) => {
          const live = item.reviewStatus === "approved";
          return (
            <div key={item.componentId} className="flex items-center gap-2 rounded-md px-2.5 py-2">
              <span className={`flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold uppercase ${live ? "bg-receipt/10 text-receipt" : "bg-secondary text-muted-foreground"}`}>{item.title.slice(0, 1)}</span>
              <span className={`min-w-0 flex-1 truncate text-xs font-medium ${live ? "text-foreground" : "text-muted-foreground"}`}>{item.title}</span>
              <span className={`flex shrink-0 items-center gap-1 text-[11px] ${live ? "text-receipt" : "text-muted-foreground"}`}>{live ? <CheckCircle className="size-3" /> : null}{live ? "Live" : "Not live"}</span>
            </div>
          );
        })}
        {collection.items.length > 4 ? <p className="px-2.5 py-1 text-[11px] text-muted-foreground">+{collection.items.length - 4} more</p> : null}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{liveCount} of {collection.items.length} live</span>
        <code className="truncate font-mono">npx modulora add @{username ?? "you"}/{collection.name}</code>
      </div>
      <div className="mt-4 flex items-center gap-1 border-t border-border/50 pt-3">
        {username && liveCount > 0 ? (
          <Button asChild variant="outline" size="sm" className="min-w-0 flex-1 gap-1.5"><Link to="/components/$namespace/$name" params={{ namespace: username, name: collection.name }}>View collection<ExternalLink className="size-3.5" /></Link></Button>
        ) : (
          <Button variant="outline" size="sm" className="min-w-0 flex-1" disabled>No live members yet</Button>
        )}
        <CollectionSellDialog collection={collection} payoutsEnabled={payoutsEnabled} />
        <CollectionDialog eligible={eligible} existing={collection} />
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Tooltip><TooltipTrigger asChild><DialogTrigger asChild><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${collection.title}`} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Trash2 />}</Button></DialogTrigger></TooltipTrigger><TooltipContent>Delete collection</TooltipContent></Tooltip>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete “{collection.title}”?</DialogTitle><DialogDescription>This removes the collection, not its component listings. This action cannot be undone.</DialogDescription></DialogHeader>
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => void onDelete()}>{busy ? "Deleting…" : "Delete collection"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}

function CollectionDialog({ eligible, existing }: { eligible: { name: string; title: string }[]; existing?: MyCollection }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(existing?.name ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [selected, setSelected] = useState<string[]>(existing?.items.map((i) => i.name) ?? []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setPending(true);
    setError(null);
    const res = await saveCollection({ data: { name, title, description, componentNames: selected } });
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
        {existing ? (
          <Button variant="outline" size="sm">Edit</Button>
        ) : (
          <Button size="sm" className="gap-1.5"><Plus className="size-3.5" /> New collection</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${existing.title}` : "New collection"}</DialogTitle>
          <DialogDescription>
            Free components only for now. Users install with <code className="font-mono text-xs">npx modulora add @you/{name || "collection-name"}</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="col-name">Name</Label>
              <Input id="col-name" value={name} onChange={(e) => setName(e.target.value.toLowerCase())} placeholder="dashboard-kit" disabled={Boolean(existing)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="col-title">Title</Label>
              <Input id="col-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dashboard Kit" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="col-desc">Description</Label>
            <Input id="col-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Everything you need for an admin dashboard." />
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium">Components</legend>
            {eligible.length === 0 ? (
              <p className="text-xs text-muted-foreground">No free components available yet.</p>
            ) : (
              <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                {eligible.map((component) => (
                  <label key={component.name} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-accent/60 motion-reduce:transition-none">
                    <input
                      type="checkbox"
                      checked={selected.includes(component.name)}
                      onChange={(e) =>
                        setSelected((prev) => (e.target.checked ? [...prev, component.name] : prev.filter((n) => n !== component.name)))
                      }
                      className="size-4 accent-foreground"
                    />
                    <span className="flex-1 truncate">{component.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{component.name}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          <Button onClick={onSave} disabled={pending || !name || !title || selected.length === 0}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {existing ? "Save changes" : "Create collection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/** Bundle pricing — mirrors the component Sell dialog (price, license, breakdown). */
function CollectionSellDialog({ collection, payoutsEnabled }: { collection: MyCollection; payoutsEnabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"modulora" | "external">(
    DIRECT_MARKETPLACE_ENABLED && !collection.externalUrl ? "modulora" : "external",
  );
  const [dollars, setDollars] = useState(collection.price != null ? String(collection.price / 100) : "");
  const [externalUrl, setExternalUrl] = useState(collection.externalUrl ?? "");
  const [licenseTemplate, setLicenseTemplate] = useState("modulora-commercial-v1");
  const [licenseText, setLicenseText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(amount: number | null) {
    setPending(true);
    setError(null);
    const res = await setCollectionPrice({ data: { name: collection.name, amount, licenseTemplate, licenseText } });
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save.");
      return;
    }
    await router.invalidate();
    setOpen(false);
  }

  async function saveExternal(url: string | null) {
    setPending(true);
    setError(null);
    const res = await setCollectionExternalUrl({ data: { name: collection.name, url } });
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
        <Button variant="ghost" size="sm">{collection.price != null || collection.externalUrl ? "Manage sale" : "Sell"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell {collection.title}</DialogTitle>
          <DialogDescription>
            {DIRECT_MARKETPLACE_ENABLED && mode === "modulora"
              ? "One price for the whole collection. Buyers get every current member — the purchase snapshots entitlements, so later edits don't change what they bought. You keep 90%."
              : `List the collection as sold on your own site. Modulora hosts no source, records no purchase, and takes no fee — buyers are linked out.${EXTERNAL_DOMAIN_VERIFICATION_REQUIRED ? " The URL must be on a domain you've verified." : " Domain verification is optional during alpha, and unverified destinations are disclosed."}`}
          </DialogDescription>
        </DialogHeader>
        {DIRECT_MARKETPLACE_ENABLED ? <div className="mt-3 flex rounded-md border border-border/60 p-0.5">
          {(["modulora", "external"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-11 flex-1 rounded px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${mode === m ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m === "modulora" ? "Sell on Modulora" : "Sold on your site"}
            </button>
          ))}
        </div> : null}
        {mode === "external" ? (
          <div className="mt-4 flex flex-col gap-3">
            <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://you.dev/pro" className="h-9" />
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="button" className="flex-1" disabled={pending || !/^https?:\/\//i.test(externalUrl.trim())} onClick={() => void saveExternal(externalUrl.trim())}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save listing
              </Button>
              {collection.externalUrl ? (
                <Button type="button" variant="outline" disabled={pending} onClick={() => void saveExternal(null)}>Remove</Button>
              ) : null}
            </div>
          </div>
        ) : !payoutsEnabled ? (
          <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-4 text-sm text-foreground">
            Connect payouts first — see the payout account section on Earnings.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input value={dollars} onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="99" className="h-9" inputMode="decimal" />
            </div>
            <EarningsBreakdown dollars={dollars} />
            <LicensePicker template={licenseTemplate} setTemplate={setLicenseTemplate} text={licenseText} setText={setLicenseText} />
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="button" className="flex-1" disabled={pending || !dollars} onClick={() => save(Math.round(parseFloat(dollars) * 100))}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save price
              </Button>
              {collection.price != null ? (
                <Button type="button" variant="outline" disabled={pending} onClick={() => save(null)}>Make free</Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
