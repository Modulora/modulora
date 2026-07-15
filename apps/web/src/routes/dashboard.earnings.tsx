/**
 * Creator earnings workspace: verified activity, profit share, sales, and
 * payout-account controls in one full-width dashboard surface.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import {
  EarningsActivityCharts,
  EarningsEmptyState,
  EarningsSummary,
  PayoutStatusPanel,
  ProfitSharePanel,
  SalesList,
} from "@/components/earnings";
import { fetchEarnings } from "@/lib/earnings";
import { DIRECT_MARKETPLACE_ENABLED } from "@/lib/flags";
import {
  getPayoutDashboardLink,
  getPayoutStatus,
  refreshPayoutStatus,
  startPayoutOnboarding,
  type PayoutStatus,
} from "@/lib/payouts";

export const Route = createFileRoute("/dashboard/earnings")({
  loader: async () => ({ earnings: await fetchEarnings(), payouts: await getPayoutStatus() }),
  component: EarningsPage,
});

function EarningsPage() {
  const { earnings, payouts } = Route.useLoaderData();
  const [status, setStatus] = useState<PayoutStatus>(payouts);
  const [busy, setBusy] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Stripe returns directly to this combined workspace. Legacy return URLs
  // still pass through /dashboard/payouts and preserve the query string.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payouts") !== "done" && params.get("payouts") !== "refresh") return;
    void refreshPayoutStatus()
      .then(setStatus)
      .catch(() => setPayoutError("Could not refresh the payout account. Try again."));
    window.history.replaceState(null, "", "/dashboard/earnings#payouts");
  }, []);

  if (!earnings) return null;

  async function onSetup() {
    setBusy(true);
    setPayoutError(null);
    const result = await startPayoutOnboarding();
    setBusy(false);
    if (result.ok && result.url) { window.location.href = result.url; return; }
    setPayoutError(result.error ?? "Could not start payout setup.");
  }

  async function onManage() {
    setBusy(true);
    setPayoutError(null);
    const result = await getPayoutDashboardLink();
    setBusy(false);
    if (result.ok && result.url) { window.open(result.url, "_blank", "noopener"); return; }
    setPayoutError(result.error ?? "Could not open the Stripe dashboard.");
  }

  return (
    <div className="w-full">
      <DashboardPageHeader
        title="Earnings"
        description={<>Verified activity, creator profit share, and payout readiness in one place. <Link to="/profit-share" className="text-foreground underline underline-offset-2">How earnings work</Link></>}
      />

      <div className="mt-6 flex flex-col gap-6">
        <EarningsSummary data={{ ...earnings, payoutsEnabled: status.payoutsEnabled }} showSales={DIRECT_MARKETPLACE_ENABLED} />
        <EarningsActivityCharts data={earnings} showSales={DIRECT_MARKETPLACE_ENABLED} />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.7fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <ProfitSharePanel
              data={earnings}
              learnMore={<Link to="/profit-share" className="text-foreground underline underline-offset-2">How the split works</Link>}
            />
            {DIRECT_MARKETPLACE_ENABLED && earnings.sales.length > 0 ? (
              <SalesList sales={earnings.sales} />
            ) : DIRECT_MARKETPLACE_ENABLED ? (
              <EarningsEmptyState payoutsEnabled={status.payoutsEnabled} />
            ) : null}
          </div>

          <div className="min-w-0">
            <PayoutStatusPanel
              status={status}
              accrued={earnings.profitSharePending}
              busy={busy}
              onSetup={() => void onSetup()}
              onManage={() => void onManage()}
            />
            {payoutError ? <p role="alert" className="mt-2 text-xs text-destructive">{payoutError}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
