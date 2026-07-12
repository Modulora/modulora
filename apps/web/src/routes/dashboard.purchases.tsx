/**
 * Owned components — the buyer-side library. Install commands, agent
 * integrate prompts, and the license snapshot for everything you've bought.
 */
import { createFileRoute } from "@tanstack/react-router";
import { PurchasesEmptyState, PurchasesList } from "@/components/owned";
import { fetchMyPurchases } from "@/lib/purchases";

export const Route = createFileRoute("/dashboard/purchases")({
  loader: async () => ({ purchases: await fetchMyPurchases() }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { purchases } = Route.useLoaderData();
  return (
    <div className="w-full max-w-4xl">
      <h1 className="text-2xl font-semibold">Purchases</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Components you own — install them, hand them to your coding agent, or review the license you agreed to.
      </p>
      <div className="mt-8">
        {purchases.length > 0 ? <PurchasesList purchases={purchases} /> : <PurchasesEmptyState />}
      </div>
    </div>
  );
}
