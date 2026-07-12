/**
 * Creator earnings: sales, totals, payout state. Presentational pieces live in
 * components/earnings.tsx (storybooked); this route wires live data.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EarningsEmptyState, EarningsSummary, ProfitSharePanel, SalesList } from "@/components/earnings";
import { fetchEarnings } from "@/lib/earnings";

export const Route = createFileRoute("/dashboard/earnings")({
  loader: async () => ({ earnings: await fetchEarnings() }),
  component: EarningsPage,
});

function EarningsPage() {
  const { earnings } = Route.useLoaderData();
  if (!earnings) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Earnings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Two streams: marketplace sales (you keep 90%) and the creator profit share.{" "}
            <Link to="/profit-share" className="text-foreground underline underline-offset-2">How earning works</Link>
          </p>
        </div>
        {!earnings.payoutsEnabled ? (
          <Button asChild size="sm">
            <Link to="/settings" hash="payouts">Set up payouts</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/settings" hash="payouts" className="gap-1.5">
              Payout settings <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <EarningsSummary data={earnings} />
        {earnings.sales.length > 0 ? (
          <SalesList sales={earnings.sales} />
        ) : (
          <EarningsEmptyState payoutsEnabled={earnings.payoutsEnabled} />
        )}
        <ProfitSharePanel
          data={earnings}
          learnMore={<Link to="/profit-share" className="text-foreground underline underline-offset-2">How the split works</Link>}
        />
      </div>
    </div>
  );
}
