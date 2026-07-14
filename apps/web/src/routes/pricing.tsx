/**
 * Pricing — Free vs Plus. Honest by construction: shipped benefits are
 * listed plainly, unshipped ones say "coming"; and the things Plus can
 * never buy (rank, trust, review priority) are stated on the page.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { HiCheck as Check, HiArrowPath as Loader2, HiSparkles as Sparkles } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { fetchCurrentUser } from "@/lib/session";
import { confirmCheckout } from "@/lib/marketplace";
import { openBillingPortal, startPlusCheckout, PLUS_PRICE_CENTS } from "@/lib/plus";

const fetchPricingContext = createServerFn({ method: "GET" }).handler(async () => {
  const user = await fetchCurrentUser();
  return {
    signedIn: Boolean(user),
    plus: user?.isPlus ?? false,
    priceCents: PLUS_PRICE_CENTS,
  };
});

export const Route = createFileRoute("/pricing")({
  loader: () => fetchPricingContext(),
  component: PricingPage,
});

const FREE = [
  "Publish unlimited components",
  "Verified installs (CLI digest checks)",
  "Link external sales with destination disclosure",
  "Profit share on verified installs",
  "Public profile, evidence, analytics",
];

const PLUS = [
  { label: "Bookmarks — save any component", live: true },
  { label: "Component lists, public or private", live: true },
  { label: "Curated lists on your public profile", live: true },
  { label: "Profile customization", live: false },
  { label: "Deeper analytics", live: false },
  { label: "Early access to new features (Labs)", live: true },
  { label: "Supports creators of free components — Plus revenue joins the profit-share pool", live: true },
];

function PricingPage() {
  const { signedIn, plus, priceCents } = Route.useLoaderData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Returning from checkout: confirm + clean the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("subscribed");
    if (sid) {
      void confirmCheckout({ data: { sessionId: sid } }).then(() => {
        window.history.replaceState(null, "", "/pricing");
        window.location.reload();
      });
    }
  }, []);

  async function onSubscribe() {
    if (!signedIn) {
      navigate({ to: "/signin" });
      return;
    }
    setBusy(true);
    setError(null);
    const res = await startPlusCheckout();
    if (res.ok && res.url) {
      window.location.href = res.url;
      return;
    }
    setError(res.error ?? "Could not start checkout.");
    setBusy(false);
  }

  async function onManage() {
    setBusy(true);
    const res = await openBillingPortal();
    setBusy(false);
    if (res.ok && res.url) window.open(res.url, "_blank", "noopener");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
      <p className="mt-2 text-muted-foreground">
        Publishing, verified installs, and earning are free — forever. Plus adds convenience for people who live in the catalog.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-border/60 bg-card/35 p-6">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="mt-1 text-3xl font-bold">$0</p>
          <ul className="mt-5 flex flex-1 flex-col gap-2.5">
            {FREE.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-receipt" /> {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col rounded-xl border border-foreground/25 bg-card/50 p-6">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            <Sparkles className="size-4" /> Plus
          </h2>
          <p className="mt-1 text-3xl font-bold">
            ${(priceCents / 100).toFixed(0)}
            <span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <ul className="mt-5 flex flex-1 flex-col gap-2.5">
            {PLUS.map((benefit) => (
              <li key={benefit.label} className="flex items-start gap-2 text-sm">
                <Check className={`mt-0.5 size-4 shrink-0 ${benefit.live ? "text-receipt" : "text-muted-foreground/40"}`} />
                <span className={benefit.live ? "" : "text-muted-foreground"}>
                  {benefit.label}
                  {!benefit.live ? <span className="ml-1.5 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">coming</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
          {plus ? (
            <Button variant="outline" disabled={busy} onClick={onManage} className="mt-4">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Manage subscription
            </Button>
          ) : (
            <Button disabled={busy} onClick={onSubscribe} className="mt-4">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Get Plus
            </Button>
          )}
        </div>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        What Plus can never buy: rank, trust badges, review priority, or moderation outcomes. The catalog is the
        same for everyone — see <Link to="/docs/$" params={{ _splat: "earning" }} className="text-foreground underline underline-offset-2">how earning works</Link>.
      </p>
    </div>
  );
}
