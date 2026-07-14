/**
 * Collection page — rendered in the component-page shell at
 * /components/@user/collection-name. A member rail on the left drives the
 * live sandbox preview on the right; the bundle installs (or sells) as one.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { HiArrowTopRightOnSquare as ExternalLink, HiLockClosed as FileLock2, HiArrowPath as Loader2, HiCommandLine as TerminalSquare } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ComponentSandbox } from "@/components/component-sandbox";
import { PriceSeal } from "@/components/money";
import { CopyChip } from "@/components/owned";
import { buyCollection } from "@/lib/marketplace";
import { usePageTheme } from "@/lib/use-page-theme";
import type { CollectionDetail } from "@/lib/catalog-db";
import { externalDomainDisclosure } from "@/lib/external-sales";

export function CollectionView({ collection }: { collection: CollectionDetail }) {
  const pageTheme = usePageTheme();
  const [selected, setSelected] = useState(0);
  const member = collection.members[selected]!;
  const installCommand = `npx modulora add @${collection.namespace}/${collection.name}`;
  const demoPath = member.files?.find((f) => f.path.startsWith("src/demos/"))?.path ?? "src/demos/default.tsx";
  const purchasable = collection.price != null && !collection.owned;
  // Collections are a grouping, not a funnel into our CLI: the bundle
  // command shows only when members actually opt into the Modulora CLI.
  // Creators with their own registries keep their own commands per member.
  const bundleInstallable = collection.members.some((m) => m.distributionChannels?.includes("modulora-cli"));
  const memberCommand = member.creatorShadcnCommand?.trim()
    ? member.creatorShadcnCommand
    : member.distributionChannels?.includes("modulora-cli")
      ? `npx modulora add @${member.namespace}/${member.name}`
      : `npx shadcn@latest add https://modulora.dev/r/@${member.namespace}/${member.name}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            by <Link to="/$username" params={{ username: collection.namespace }} className="text-foreground/80 hover:text-foreground">{collection.namespace}</Link>
          </span>
          <span>·</span>
          <span>collection · {collection.members.length} component{collection.members.length === 1 ? "" : "s"}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{collection.title}</h1>
            {collection.description ? <p className="mt-2 max-w-3xl text-muted-foreground">{collection.description}</p> : null}
          </div>
          <PriceSeal
            size="md"
            paid={collection.price != null || collection.external != null}
            label={
              collection.price != null
                ? `$${collection.price / 100}`
                : collection.external
                  ? `on ${collection.external.domain}`
                  : undefined
            }
          />
        </div>
      </header>

      <div className="mt-6">
        {collection.external ? (
          <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/35 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium">Available from the creator</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sold and fulfilled on {collection.external.domain}. Modulora hosts no source for this
                collection and records no purchase — installs aren&apos;t digest-verified.{" "}
                {externalDomainDisclosure(collection.external.verifiedAt)}
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <a href={collection.external.url} target="_blank" rel="noreferrer">
                Get it on {collection.external.domain} <ExternalLink />
              </a>
            </Button>
          </div>
        ) : purchasable ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/35 p-4">
            <div>
              <p className="text-sm font-medium">Buy the collection</p>
              <p className="mt-1 text-xs text-muted-foreground">
                One purchase unlocks all {collection.members.length} components for your account — including future installs of each.
              </p>
            </div>
            <BuyCollectionDialog collection={collection} />
          </div>
        ) : bundleInstallable ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/35 px-4 py-3">
            <code className="truncate font-mono text-xs text-muted-foreground">{installCommand}</code>
            <CopyChip label="Copy" text={installCommand} icon={TerminalSquare} />
          </div>
        ) : null}
        {collection.owned ? <p className="mt-2 text-xs text-receipt">You own this collection.</p> : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav className="flex flex-col gap-1">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Components</p>
          {collection.members.map((item, index) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setSelected(index)}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                index === selected ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <span className="flex-1 truncate">{item.title}</span>
              {item.locked ? <FileLock2 className="size-3.5 shrink-0 opacity-70" /> : null}
            </button>
          ))}
          <Link
            to="/components/$namespace/$name"
            params={{ namespace: member.namespace, name: member.name }}
            className="mt-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Open {member.title} →
          </Link>
        </nav>

        <div className={`overflow-hidden rounded-xl border border-border/60 ${pageTheme === "dark" ? "bg-[#0d0d0d]" : "bg-[#f5f5f3]"}`}>
          {member.locked ? (
            <div className="flex h-[32rem] flex-col items-center justify-center gap-3 text-center">
              <span className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/60">
                <FileLock2 className="size-5" />
              </span>
              <div>
                <p className="font-semibold">Purchase to preview</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {member.title} is a paid component — buying the collection unlocks it.
                </p>
              </div>
            </div>
          ) : (
            <ComponentSandbox
              key={member.name}
              files={(member.files ?? []).map((f) => ({ path: f.path, content: f.content }))}
              selectedDemo={demoPath}
              theme={pageTheme}
              className="h-[32rem]"
            />
          )}
          {!member.locked ? (
            <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2.5">
              <code className="truncate font-mono text-xs text-muted-foreground">{memberCommand}</code>
              <CopyChip label="Copy" text={memberCommand} icon={TerminalSquare} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BuyCollectionDialog({ collection }: { collection: Pick<CollectionDetail, "namespace" | "name" | "price" | "license"> }) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onBuy() {
    setBusy(true);
    setError(null);
    const res = await buyCollection({ data: { namespace: collection.namespace, name: collection.name, acceptLicense: agreed } });
    if (res.ok && res.url) {
      window.location.href = res.url;
      return;
    }
    setError(res.error ?? "Could not start checkout.");
    setBusy(false);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="shrink-0">Buy ${(collection.price ?? 0) / 100}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>License terms</DialogTitle>
          <DialogDescription>
            {collection.license?.name ?? "Seller license"} — covers every component in the collection. Your agreement is recorded with the purchase.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-secondary/20 p-3">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{collection.license?.text || "No license text provided."}</pre>
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-foreground" />
          <span>I agree to the seller&apos;s license terms for this collection.</span>
        </label>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        <Button onClick={onBuy} disabled={busy || !agreed} className="mt-3 w-full gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Agree &amp; buy
        </Button>
      </DialogContent>
    </Dialog>
  );
}
