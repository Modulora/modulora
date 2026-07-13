/* ─────────────────────────────────────────────────────────
 * MY COMPONENTS — manage/edit/remove
 *
 *    0ms   hidden
 *   70ms   heading rises
 *  160ms   rows rise, staggered 50ms
 * ───────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Blocks, ExternalLink, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Tag } from "lucide-react";

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

const TIMING = { heading: 70, rows: 160 };
const RISE = {
  offsetY: 8,
  stagger: 0.05,
  spring: { type: "spring" as const, stiffness: 340, damping: 28 },
};

function MyComponents() {
  const { components } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [promoted, setPromoted] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), TIMING.heading),
      setTimeout(() => setStage(2), TIMING.rows),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

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
      <motion.div
        initial={{ opacity: 0, y: RISE.offsetY }}
        animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : RISE.offsetY }}
        transition={RISE.spring}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Components</h1>
          <p className="mt-1 text-muted-foreground">Edit or remove what you've published.</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/dashboard/new"><Plus className="size-4" /> New component</Link>
        </Button>
      </motion.div>

      {promoted ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-500">
          Promotion active — your component is now featured on browse.
        </div>
      ) : null}

      {components.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 2 ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 text-center"
        >
          <Blocks className="size-5 text-muted-foreground" />
          <div>
            <p className="font-medium">No components yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Publish your first component to see it here.</p>
          </div>
          <Button asChild size="sm"><Link to="/dashboard/new">New component</Link></Button>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {components.map((component, index) => (
            <motion.div
              key={component.name}
              initial={{ opacity: 0, y: RISE.offsetY }}
              animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : RISE.offsetY }}
              transition={{ ...RISE.spring, delay: index * RISE.stagger }}
            >
              <ComponentRow component={component} username={user?.username ?? ""} payoutsEnabled={Boolean(user?.payoutsEnabled)} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewBadge({ status }: { status: MyComponent["reviewStatus"] }) {
  const map = {
    draft: { label: "Draft", cls: "bg-secondary text-muted-foreground" },
    approved: { label: "Live", cls: "bg-emerald-500/10 text-emerald-500" },
    pending: { label: "In review", cls: "bg-amber-500/10 text-amber-500" },
    rejected: { label: "Changes requested", cls: "bg-destructive/10 text-destructive" },
  } as const;
  const { label, cls } = map[status];
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${cls}`}>{label}</span>;
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
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-500">Connect payouts first — it takes about two minutes, and you keep 90% of every sale.</p>
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
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
      <LiveCardPreview
        item={{ namespace: username, name: component.name, title: component.title, live: true }}
        className="w-28 shrink-0 max-sm:hidden"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate font-medium">{component.title}</h2>
          <PriceSeal paid={component.sourceModel !== "open-source" || component.marketplacePrice != null} label={component.marketplacePrice != null ? `$${component.marketplacePrice / 100}` : undefined} />
          <ReviewBadge status={component.reviewStatus} />
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">@{username}/{component.name}@{component.version} · {component.category}</p>
        {component.reviewStatus === "rejected" && component.reviewReason ? (
          <p className="mt-1 line-clamp-2 text-xs text-destructive">Changes requested: {component.reviewReason}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/components/$namespace/$name" params={{ namespace: username, name: component.name }}><ExternalLink className="size-3.5" /> View</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/dashboard/edit/$name" params={{ name: component.name }}><Pencil className="size-3.5" /> Edit</Link>
        </Button>
        {component.reviewStatus === "approved" ? (
          <>
            <PriceDialog component={component} payoutsEnabled={payoutsEnabled} />
            <Button variant="ghost" size="sm" className="gap-1.5" disabled={promoting} onClick={onPromote}>
              {promoting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Promote
            </Button>
          </>
        ) : null}
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirm(""); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {component.title}?</DialogTitle>
              <DialogDescription>This permanently removes @{username}/{component.name} and all its versions. This cannot be undone.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex flex-col gap-3">
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={component.name} autoComplete="off" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />
              <Button type="button" variant="destructive" disabled={!matches || pending} onClick={onDelete}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Delete component
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
