/**
 * Payouts — its own page under the dashboard shell. Stripe Connect status,
 * profit-share distribution status and payout threshold.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Banknote, Check, Loader2, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import {
  getPayoutDashboardLink,
  getPayoutStatus,
  refreshPayoutStatus,
  startPayoutOnboarding,
  type PayoutStatus,
} from "@/lib/payouts";
import { PAYOUT_THRESHOLD_CENTS } from "@/lib/profit-share";

export const Route = createFileRoute("/dashboard/payouts")({
  loader: async () => ({ payouts: await getPayoutStatus() }),
  component: PayoutsPage,
});

const THRESHOLD = `$${(PAYOUT_THRESHOLD_CENTS / 100).toFixed(0)}`;

function PayoutsPage() {
  const { payouts } = Route.useLoaderData();
  const [status, setStatus] = useState<PayoutStatus>(payouts);
  const [busy, setBusy] = useState(false);

  // Returning from Stripe onboarding: re-check and persist the account status.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payouts") === "done" || params.get("payouts") === "refresh") {
      void refreshPayoutStatus().then(setStatus);
      window.history.replaceState(null, "", "/dashboard/payouts");
    }
  }, []);

  async function onSetup() {
    setBusy(true);
    const res = await startPayoutOnboarding();
    setBusy(false);
    if (res.ok && res.url) window.location.href = res.url;
  }
  async function onManage() {
    setBusy(true);
    const res = await getPayoutDashboardLink();
    setBusy(false);
    if (res.ok && res.url) window.open(res.url, "_blank", "noopener");
  }

  return (
    <div className="w-full max-w-3xl">
      <DashboardPageHeader
        title="Payouts"
        description="Connect a Stripe account once — both earning streams pay into it. Stripe handles identity verification, banking, and tax."
      />

      <div className="mt-8 flex flex-col gap-6">
        {/* Status */}
        {!status.configured ? (
          <p className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
            Payments aren&apos;t enabled on this environment yet.
          </p>
        ) : status.payoutsEnabled ? (
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/35 px-5 py-4">
            <span className="flex items-center gap-2.5 text-sm font-medium">
              <Banknote className="size-4 text-muted-foreground" /> Payouts active
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-receipt">
                <Check className="size-3.5" /> Verified
              </span>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onManage} className="gap-1.5">
                Stripe dashboard <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : status.connected ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-secondary/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2.5 text-sm font-medium">
              <Banknote className="size-4 text-muted-foreground" /> Onboarding incomplete
            </span>
            <Button type="button" size="sm" disabled={busy} onClick={onSetup}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Finish setup
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/35 p-5">
            <p className="text-sm">
              Set up payouts to receive creator profit-share distributions once your accrued balance reaches the threshold.
            </p>
            <Button type="button" size="lg" className="w-full gap-2" disabled={busy} onClick={onSetup}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />} Set up payouts
            </Button>
          </div>
        )}

        <div className="grid gap-4">
          <div className="rounded-xl border border-border/60 bg-card/35 p-5">
            <div className="flex items-center gap-2">
              <PieChart className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Profit share</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Distributed periodically, weighted by verified CLI installs. A distribution pays out once your accrued share reaches {THRESHOLD}; smaller balances roll over to the next run — nothing is forfeited.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Track what you&apos;ve earned on the{" "}
          <Link to="/dashboard/earnings" className="text-foreground underline underline-offset-2">Earnings page</Link>, or read{" "}
          <Link to="/profit-share" className="text-foreground underline underline-offset-2">how earning works</Link>.
        </p>
      </div>
    </div>
  );
}
