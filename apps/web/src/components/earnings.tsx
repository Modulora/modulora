/**
 * Earnings surfaces — presentational only (no server imports) so they render
 * in Storybook with mock data and on the dashboard with live data.
 */
import type { ReactNode } from "react";
import { Banknote, PieChart, ShieldCheck, ShoppingBag } from "lucide-react";
import type { EarningsData, EarningsSale } from "@/lib/earnings";

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function EarningsSummary({ data }: { data: EarningsData }) {
  const cards = [
    { label: "Sales earnings", value: money(data.netAmount), sub: `${money(data.grossAmount)} gross − ${money(data.feeAmount)} fees`, icon: Banknote },
    { label: "Sales", value: String(data.totalSales), sub: "one-time purchases", icon: ShoppingBag },
    { label: "Profit share", value: money(data.profitShareDistributed), sub: "distributed to date", icon: PieChart },
    { label: "Verified installs", value: String(data.verifiedInstalls), sub: "digest-verified via the CLI", icon: ShieldCheck },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

/**
 * The second earning stream: the 30% creator pool, weighted by verified CLI
 * installs. Honest by construction — shows the real attribution count and the
 * real distributed total; nothing is projected or estimated.
 */
export function ProfitSharePanel({ data, learnMore }: { data: EarningsData; learnMore?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/35 p-5">
      <div className="flex items-center gap-2">
        <PieChart className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Profit share</h2>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        30% of Modulora&apos;s distributable profit goes to creators, split by verified CLI installs.
        Your components have <span className="font-medium text-foreground">{data.verifiedInstalls}</span> verified install{data.verifiedInstalls === 1 ? "" : "s"} counting toward your share.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {data.profitShareDistributed > 0
          ? <>Distributed to you so far: <span className="font-medium text-emerald-500">{money(data.profitShareDistributed)}</span>.</>
          : "Distributions haven't started yet — installs are being counted now, and your accrued attribution applies when the first distribution runs."}
        {learnMore ? <> {learnMore}</> : null}
      </p>
    </div>
  );
}

export function SalesList({ sales }: { sales: EarningsSale[] }) {
  if (sales.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-card/35 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Component</th>
            <th className="px-4 py-2.5 font-medium">Buyer</th>
            <th className="px-4 py-2.5 text-right font-medium">Price</th>
            <th className="px-4 py-2.5 text-right font-medium">You earned</th>
            <th className="px-4 py-2.5 text-right font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-b border-border/40 last:border-0">
              <td className="px-4 py-3 font-medium">{sale.componentTitle}</td>
              <td className="px-4 py-3 text-muted-foreground">{sale.buyerUsername ? `@${sale.buyerUsername}` : "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{money(sale.amount)}</td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-emerald-500">{money(sale.amount - sale.feeAmount)}</td>
              <td className="px-4 py-3 text-right text-xs text-muted-foreground">{relativeTime(sale.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EarningsEmptyState({ payoutsEnabled }: { payoutsEnabled: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-6 py-12 text-center">
      <Banknote className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">No sales yet</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        {payoutsEnabled
          ? "Set a price on one of your components — buyers pay through Modulora and you keep 90% of every sale."
          : "Connect payouts, then set a price on one of your components. You keep 90% of every sale."}
      </p>
    </div>
  );
}

function relativeTime(iso: string): string {
  const secs = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
