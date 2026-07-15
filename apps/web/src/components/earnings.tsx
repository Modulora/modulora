/**
 * Earnings surfaces — presentational only (no server imports) so they render
 * in Storybook with mock data and on the dashboard with live data.
 */
import type { ReactNode } from "react";
import {
  HiArrowTopRightOnSquare as ArrowUpRight,
  HiBanknotes as Banknote,
  HiChartPie as PieChart,
  HiCheck as Check,
  HiClock as Clock,
  HiArrowPath as Loader2,
  HiShieldCheck as ShieldCheck,
  HiShoppingBag as ShoppingBag,
} from "react-icons/hi2";

import type { EarningsData, EarningsSale } from "@/lib/earnings";
import type { PayoutStatus } from "@/lib/payouts";
import { PAYOUT_THRESHOLD_CENTS } from "@/lib/profit-share";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SparkChart } from "@/components/spark-chart";

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function EarningsSummary({ data, showSales = true }: { data: EarningsData; showSales?: boolean }) {
  const cards = [
    { label: "Accrued share", value: money(data.profitSharePending), sub: "waiting for a distribution run", icon: Clock },
    { label: "Distributed", value: money(data.profitShareDistributed), sub: "profit share paid to date", icon: PieChart },
    { label: "Verified installs", value: String(data.verifiedInstalls), sub: "digest-verified via the CLI", icon: ShieldCheck },
    showSales
      ? { label: "Sales earnings", value: money(data.netAmount), sub: `${money(data.grossAmount)} gross − ${money(data.feeAmount)} fees`, icon: ShoppingBag }
      : { label: "Payout account", value: data.payoutsEnabled ? "Active" : "Setup needed", sub: data.payoutsEnabled ? "ready to receive transfers" : "connect through Stripe", icon: Banknote },
  ];
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border/60 bg-card/35 lg:grid-cols-4">
      {cards.map((card, index) => (
        <div key={card.label} className={`border-border/60 p-4 ${index === 0 ? "border-b border-r lg:border-b-0" : index === 1 ? "border-b lg:border-b-0 lg:border-r" : index === 2 ? "border-r" : ""}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <card.icon className="size-3.5" />
            {card.label}
          </div>
          <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl">{card.value}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

export function EarningsActivityCharts({ data, showSales = true }: { data: EarningsData; showSales?: boolean }) {
  const moneyValue = (value: number) => money(value);
  const chartClass = showSales ? "xl:grid-cols-3" : "xl:grid-cols-2";
  return (
    <section aria-labelledby="earnings-activity-title" className="rounded-xl border border-border/60 bg-card/20 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="earnings-activity-title" className="text-sm font-semibold">30-day activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">Hover, touch, or focus a chart and use arrow keys to inspect each day.</p>
        </div>
        <span className="text-[11px] text-muted-foreground">UTC · trailing 30 days</span>
      </div>
      <div className={`mt-4 grid gap-3 ${chartClass}`}>
        <SparkChart points={data.trend.map((point) => ({ date: point.date, value: point.verifiedInstalls }))} label="Verified installs" height={128} />
        <SparkChart points={data.trend.map((point) => ({ date: point.date, value: point.profitShareAccrued }))} label="Profit share accrued" color="var(--ticket)" height={128} formatValue={moneyValue} />
        {showSales ? <SparkChart points={data.trend.map((point) => ({ date: point.date, value: point.netSales }))} label="Net sales" color="var(--ticket)" height={128} formatValue={moneyValue} /> : null}
      </div>
    </section>
  );
}

export function PayoutStatusPanel({ status, accrued, busy, onSetup, onManage }: { status: PayoutStatus; accrued: number; busy: boolean; onSetup: () => void; onManage: () => void }) {
  const threshold = PAYOUT_THRESHOLD_CENTS;
  const progress = threshold > 0 ? Math.min(100, (accrued / threshold) * 100) : 0;
  return (
    <section id="payouts" aria-labelledby="payout-account-title" className="rounded-xl border border-border/60 bg-card/35 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2"><Banknote className="size-4 text-muted-foreground" /><h2 id="payout-account-title" className="text-sm font-semibold">Payout account</h2></div>
        {status.payoutsEnabled ? <span className="flex items-center gap-1 text-xs text-receipt"><Check className="size-3.5" />Transfers ready</span> : null}
      </div>

      {!status.configured ? (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Payments are not enabled in this environment yet.</p>
      ) : status.payoutsEnabled ? (
        <>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Stripe handles identity checks, banking details, tax information, and transfers.</p>
          <Button type="button" variant="outline" size="sm" className="mt-4 w-full gap-1.5" disabled={busy} onClick={onManage}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : null}Manage in Stripe<ArrowUpRight className="size-3.5" /></Button>
        </>
      ) : status.connected ? (
        <>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Your Stripe account exists, but onboarding must be completed before it can receive transfers.</p>
          <Button type="button" size="sm" className="mt-4 w-full" disabled={busy} onClick={onSetup}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : null}Finish setup</Button>
        </>
      ) : (
        <>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Connect Stripe once to receive creator profit-share distributions and marketplace earnings when enabled.</p>
          <Button type="button" size="sm" className="mt-4 w-full gap-1.5" disabled={busy} onClick={onSetup}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Banknote className="size-3.5" />}Set up payouts</Button>
        </>
      )}

      <div className="mt-5 border-t border-border/50 pt-4">
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">Accrued toward next payout</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(accrued)}</p></div><span className="text-xs tabular-nums text-muted-foreground">{accrued >= threshold ? "Threshold reached" : `${money(Math.max(0, threshold - accrued))} remaining`}</span></div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Payout threshold progress" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(accrued, threshold)} aria-valuetext={`${money(accrued)} accrued toward ${money(threshold)}`}><div className="h-full rounded-full bg-ticket transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Balances below {money(threshold)} roll over. Nothing is forfeited.</p>
      </div>
    </section>
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
          ? <>Distributed to you so far: <span className="font-medium text-receipt">{money(data.profitShareDistributed)}</span>.</>
          : "No distributions have been paid to you yet."}{" "}
        {data.profitSharePending > 0 ? (
          <>Accrued and waiting: <span className="font-medium text-foreground">{money(data.profitSharePending)}</span> — pays out on a distribution run once it reaches {`$${(PAYOUT_THRESHOLD_CENTS / 100).toFixed(0)}`}.</>
        ) : (
          <>Distributions pay out once your accrued share reaches {`$${(PAYOUT_THRESHOLD_CENTS / 100).toFixed(0)}`}; smaller balances roll over.</>
        )}
        {learnMore ? <> {learnMore}</> : null}
      </p>
    </div>
  );
}

export function SalesList({ sales }: { sales: EarningsSale[] }) {
  if (sales.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="min-w-[42rem] w-full text-sm">
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
              <td className="px-4 py-3 text-right font-medium tabular-nums text-receipt">{money(sale.amount - sale.feeAmount)}</td>
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
    <EmptyState
      icon={Banknote}
      title="No sales yet"
      description={
        payoutsEnabled
          ? "Set a price on one of your components — buyers pay through Modulora and you keep 90% of every sale."
          : "Connect payouts, then set a price on one of your components. You keep 90% of every sale."
      }
    />
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
