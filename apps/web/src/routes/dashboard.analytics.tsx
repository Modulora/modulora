/** Creator analytics: views + verified installs per component. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnalyticsEmptyState, AnalyticsTable, AnalyticsTotals } from "@/components/analytics";
import { fetchCreatorAnalytics } from "@/lib/analytics";

export const Route = createFileRoute("/dashboard/analytics")({
  loader: async () => ({ analytics: await fetchCreatorAnalytics() }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { analytics } = Route.useLoaderData();
  if (!analytics) return null;
  const hasData = analytics.components.length > 0;

  return (
    <div className="w-full max-w-4xl">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Views and verified installs. Only installs earn — see{" "}
        <Link to="/docs/$" params={{ _splat: "earning" }} className="text-foreground underline underline-offset-2">how earning works</Link>.
      </p>
      <div className="mt-8 flex flex-col gap-6">
        <AnalyticsTotals totals={analytics.totals} />
        {hasData ? <AnalyticsTable components={analytics.components} /> : <AnalyticsEmptyState />}
      </div>
    </div>
  );
}
