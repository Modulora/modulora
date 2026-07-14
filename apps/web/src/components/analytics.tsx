/**
 * Creator analytics surfaces — presentational only (Storybook-safe).
 * Honest numbers: views (owner visits excluded), digest-verified installs,
 * paid sales. Views never affect earnings, and the panel says so.
 */
import { HiEye as Eye, HiShieldCheck as ShieldCheck, HiShoppingBag as ShoppingBag } from "react-icons/hi2";

import { EmptyState } from "@/components/ui/empty-state";
import type { CreatorAnalytics } from "@/lib/analytics";

export function AnalyticsTotals({ totals }: { totals: CreatorAnalytics["totals"] }) {
  const cards = [
    { label: "Views", value: totals.views, sub: "public detail-page views, your own excluded", icon: Eye },
    { label: "Verified installs", value: totals.verifiedInstalls, sub: "digest-verified via the CLI — these earn", icon: ShieldCheck },
    { label: "Sales", value: totals.sales, sub: "one-time purchases", icon: ShoppingBag },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-border/60 bg-card/35 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <card.icon className="size-3.5" />
            {card.label}
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{card.value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsTable({ components }: { components: CreatorAnalytics["components"] }) {
  if (components.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-card/35 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Component</th>
            <th className="px-4 py-2.5 text-right font-medium">Views</th>
            <th className="px-4 py-2.5 text-right font-medium">Verified installs</th>
            <th className="px-4 py-2.5 text-right font-medium">Sales</th>
          </tr>
        </thead>
        <tbody>
          {components.map((component) => (
            <tr key={component.name} className="border-b border-border/40 last:border-0">
              <td className="px-4 py-3">
                <span className="font-medium">{component.title}</span>
                {component.reviewStatus !== "approved" ? (
                  <span className="ml-2 text-xs text-muted-foreground">({component.reviewStatus === "pending" ? "in review" : "not live"})</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{component.views}</td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-receipt">{component.verifiedInstalls}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{component.sales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsEmptyState() {
  return (
    <EmptyState
      icon={Eye}
      title="Nothing to count yet"
      description="Views and verified installs appear here once a component is live. Only digest-verified CLI installs count toward earnings — views never do."
    />
  );
}
