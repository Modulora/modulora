/**
 * Collections — group your components into installable kits. One install
 * command pulls every member, each digest-verified individually.
 */
import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteCollection, fetchMyCollections, saveCollection, type MyCollection } from "@/lib/collections";
import { fetchMyComponents } from "@/lib/catalog-db";
import { setCollectionExternalUrl, setCollectionPrice } from "@/lib/marketplace";
import { getPayoutStatus } from "@/lib/payouts";
import { EarningsBreakdown, LicensePicker, PriceSeal } from "@/components/money";
import { DIRECT_MARKETPLACE_ENABLED } from "@/lib/flags";

export const Route = createFileRoute("/dashboard/collections")({
  loader: async () => ({
    collections: await fetchMyCollections(),
    components: await fetchMyComponents(),
    payouts: await getPayoutStatus(),
  }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { collections, components, payouts } = Route.useLoaderData();
  const eligible = components;

  return (
    <div className="w-full max-w-3xl">
      <DashboardPageHeader
        title="Collections"
        description="Group your components into installable kits — one command installs every member, each digest-verified on its own. Only approved, public members serve."
        action={<CollectionDialog eligible={eligible.map((c) => ({ name: c.name, title: c.title }))} />}
      />

      <div className="mt-8 flex flex-col gap-3">
        {collections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No collections yet"
            description="Bundle related components — a dashboard kit, a marketing set — and users install the whole thing with one command."
          />
        ) : (
          collections.map((collection) => <CollectionRow key={collection.id} collection={collection} eligible={eligible.map((c) => ({ name: c.name, title: c.title }))} payoutsEnabled={payouts.payoutsEnabled} />)
        )}
      </div>
    </div>
  );
}

function CollectionRow({ collection, eligible, payoutsEnabled }: { collection: MyCollection; eligible: { name: string; title: string }[]; payoutsEnabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-medium">{collection.title}</h2>
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
              {collection.items.length} component{collection.items.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{collection.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CollectionSellDialog collection={collection} payoutsEnabled={payoutsEnabled} />
          <CollectionDialog eligible={eligible} existing={collection} />
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await deleteCollection({ data: { name: collection.name } });
              await router.invalidate();
              setBusy(false);
            }}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {collection.items.map((item) => (
          <span key={item.componentId} className={`rounded-md border border-border/60 px-2 py-0.5 text-xs ${item.reviewStatus === "approved" ? "text-foreground" : "text-muted-foreground line-through decoration-border"}`} title={item.reviewStatus === "approved" ? undefined : "Not live — won't serve until approved"}>
            {item.title}
          </span>
        ))}
      </div>
    </div>
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
          <div className="flex flex-col gap-1.5">
            <Label>Components</Label>
            {eligible.length === 0 ? (
              <p className="text-xs text-muted-foreground">No free components available yet.</p>
            ) : (
              <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-lg border border-border/60 p-2">
                {eligible.map((component) => (
                  <label key={component.name} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60">
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
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
        <Button variant="ghost" size="sm">
          {DIRECT_MARKETPLACE_ENABLED && collection.price != null ? (
            <PriceSeal paid label={`$${collection.price / 100}`} />
          ) : collection.externalUrl ? (
            <PriceSeal paid label="external" />
          ) : (
            "Sell"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell {collection.title}</DialogTitle>
          <DialogDescription>
            {DIRECT_MARKETPLACE_ENABLED && mode === "modulora"
              ? "One price for the whole collection. Buyers get every current member — the purchase snapshots entitlements, so later edits don't change what they bought. You keep 90%."
              : "List the collection as sold on your own site. Modulora hosts no source, records no purchase, and takes no fee — buyers are linked out. The URL must be on a domain you've verified."}
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
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
            Connect payouts first — see the Payouts page.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input value={dollars} onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="99" className="h-9" inputMode="decimal" />
            </div>
            <EarningsBreakdown dollars={dollars} />
            <LicensePicker template={licenseTemplate} setTemplate={setLicenseTemplate} text={licenseText} setText={setLicenseText} />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
