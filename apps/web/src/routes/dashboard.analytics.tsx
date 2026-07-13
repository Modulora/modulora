/** Creator analytics: views + verified installs per component. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnalyticsEmptyState, AnalyticsTable, AnalyticsTotals } from "@/components/analytics";
import { fetchAnalyticsSeries, fetchCreatorAnalytics } from "@/lib/analytics";
import { SparkChart } from "@/components/spark-chart";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard/analytics")({
  loader: async () => ({ analytics: await fetchCreatorAnalytics(), series: await fetchAnalyticsSeries() }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { analytics, series } = Route.useLoaderData();
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
        {series.enabled ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <SparkChart label="Views · 30d" color="#a1a1aa" points={series.series.map((p) => ({ date: p.date, value: p.views }))} />
            <SparkChart label="Verified installs · 30d" color="#10b981" points={series.series.map((p) => ({ date: p.date, value: p.installs }))} />
            <SparkChart label="Sales · 30d" color="#f59e0b" points={series.series.map((p) => ({ date: p.date, value: p.sales }))} />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-border/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline size-3 text-amber-400" />
              30-day trend charts are in Plus early access.
            </p>
            <Link to="/pricing" className="shrink-0 text-xs font-medium text-foreground underline underline-offset-2">Get Plus</Link>
          </div>
        )}
        {hasData ? <AnalyticsTable components={analytics.components} /> : <AnalyticsEmptyState />}
      </div>
    </div>
  );
}
