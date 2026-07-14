/** Creator analytics: views + verified installs per component. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnalyticsEmptyState, AnalyticsTable, AnalyticsTotals } from "@/components/analytics";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { fetchAnalyticsSeries, fetchCreatorAnalytics } from "@/lib/analytics";
import { SparkChart } from "@/components/spark-chart";
import { HiSparkles as Sparkles } from "react-icons/hi2";


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
      <DashboardPageHeader
        title="Analytics"
        description={<>Views and verified installs. Only installs earn — see{" "}<Link to="/docs/$" params={{ _splat: "earning" }} className="text-foreground underline underline-offset-2">how earning works</Link>.</>}
      />
      <div className="mt-8 flex flex-col gap-6">
        <AnalyticsTotals totals={analytics.totals} />
        {series.enabled ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <SparkChart label="Views · 30d" color="var(--muted-foreground)" points={series.series.map((p) => ({ date: p.date, value: p.views }))} />
            <SparkChart label="Verified installs · 30d" color="var(--receipt)" points={series.series.map((p) => ({ date: p.date, value: p.installs }))} />
            <SparkChart label="Sales · 30d" color="var(--ticket)" points={series.series.map((p) => ({ date: p.date, value: p.sales }))} />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-border/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline size-3 text-muted-foreground" />
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
