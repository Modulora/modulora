/**
 * Owned components — the buyer-side library. Install commands, agent
 * integrate prompts, and the license snapshot for everything you've bought.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PurchasesEmptyState, PurchasesList } from "@/components/owned";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { fetchMyPurchases } from "@/lib/purchases";

export const Route = createFileRoute("/dashboard/purchases")({
  loader: async () => ({ purchases: await fetchMyPurchases() }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { purchases } = Route.useLoaderData();
  return (
    <div className="w-full max-w-4xl">
      <DashboardPageHeader
        title="Purchases"
        description="Components you own — install them, hand them to your coding agent, or review the license you agreed to."
      />
      <div className="mt-8">
        {purchases.length > 0 ? <PurchasesList purchases={purchases} /> : <PurchasesEmptyState />}
      </div>
    </div>
  );
}
