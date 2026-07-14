/**
 * Creator earnings: sales, totals, payout state. Presentational pieces live in
 * components/earnings.tsx (storybooked); this route wires live data.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { HiArrowUpRight as ArrowUpRight } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { EarningsEmptyState, EarningsSummary, ProfitSharePanel, SalesList } from "@/components/earnings";
import { fetchEarnings } from "@/lib/earnings";
import { DIRECT_MARKETPLACE_ENABLED } from "@/lib/flags";

export const Route = createFileRoute("/dashboard/earnings")({
  loader: async () => ({ earnings: await fetchEarnings() }),
  component: EarningsPage,
});

function EarningsPage() {
  const { earnings } = Route.useLoaderData();
  if (!earnings) return null;

  return (
    <div className="w-full max-w-4xl">
      <DashboardPageHeader
        title="Earnings"
        description={<>{DIRECT_MARKETPLACE_ENABLED ? "Marketplace sales and creator profit share." : "Your share of Modulora's distributable profit, based on verified CLI installs."}{" "}<Link to="/profit-share" className="text-foreground underline underline-offset-2">How earning works</Link></>}
        action={!earnings.payoutsEnabled ? (
          <Button asChild size="sm">
            <Link to="/dashboard/payouts">Set up payouts</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/payouts" className="gap-1.5">
              Payout settings <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        )}
      />

      <div className="mt-8 flex flex-col gap-6">
        <EarningsSummary data={earnings} showSales={DIRECT_MARKETPLACE_ENABLED} />
        {DIRECT_MARKETPLACE_ENABLED && earnings.sales.length > 0 ? (
          <SalesList sales={earnings.sales} />
        ) : DIRECT_MARKETPLACE_ENABLED ? (
          <EarningsEmptyState payoutsEnabled={earnings.payoutsEnabled} />
        ) : null}
        <ProfitSharePanel
          data={earnings}
          learnMore={<Link to="/profit-share" className="text-foreground underline underline-offset-2">How the split works</Link>}
        />
      </div>
    </div>
  );
}
