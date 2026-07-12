/* ─────────────────────────────────────────────────────────
 * REVIEW QUEUE — curator-only. Components awaiting approval.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CheckCircle2, ClipboardCheck, Clock } from "lucide-react";

import { fetchReviewQueue, type ReviewListItem } from "@/lib/review";
import { createPayoutRun, listPayoutRuns, type PayoutRunSummary } from "@/lib/distribution";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/review/")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
    if (!context.user.isCurator) throw redirect({ to: "/" });
  },
  loader: async () => {
    const { items } = await fetchReviewQueue();
    const runs = await listPayoutRuns();
    return { items, runs };
  },
  component: ReviewQueue,
});

function timeAgo(iso: string): string {
  const secs = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
  ];
  let value = secs;
  let unit = "s";
  for (const [step, label] of units) {
    if (value < step) break;
    value = Math.floor(value / step);
    unit = label;
  }
  return `${value}${unit} ago`;
}

function ReviewQueue() {
  const { items, runs } = Route.useLoaderData();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="mb-8 flex items-center gap-3"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
          <ClipboardCheck className="size-4.5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Review queue</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} component{items.length === 1 ? "" : "s"} awaiting approval
          </p>
        </div>
      </motion.div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <CheckCircle2 className="mb-3 size-8 text-emerald-500" />
          <p className="text-sm font-medium">Queue is clear</p>
          <p className="text-sm text-muted-foreground">Nothing is waiting for review.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {items.map((item: ReviewListItem, i: number) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={ready ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.08 + i * 0.04, type: "spring", stiffness: 340, damping: 28 }}
            >
              <Link
                to="/review/$id"
                params={{ id: item.id }}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.namespace} · {item.category} · {item.paid ? "Paid" : "Free"}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {timeAgo(item.submittedAt)}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}

      <DistributionsSection runs={runs} />
    </div>
  );
}

/** Platform operations: run a profit-share distribution (curators only). */
function DistributionsSection({ runs }: { runs: PayoutRunSummary[] }) {
  const router = useRouter();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [start, setStart] = useState(runs[0]?.periodEnd?.slice(0, 10) ?? monthStart.toISOString().slice(0, 10));
  const [end, setEnd] = useState(now.toISOString().slice(0, 10));
  const [dollars, setDollars] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;

  async function onRun() {
    setBusy(true);
    setMessage(null);
    const res = await createPayoutRun({
      data: {
        periodStart: new Date(`${start}T00:00:00Z`).toISOString(),
        periodEnd: new Date(`${end}T23:59:59Z`).toISOString(),
        distributableAmount: Math.round(parseFloat(dollars) * 100),
      },
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.error ?? "Run failed.");
      return;
    }
    const t = res.totals!;
    setMessage(`Run complete: ${t.creators} creator(s), ${t.installs} install(s) — pool ${money(t.pool)}, paid ${money(t.paid)}, carried ${money(t.carried)}.`);
    setDollars("");
    await router.invalidate();
  }

  return (
    <div className="mt-12">
      <h2 className="text-sm font-semibold">Profit-share distributions</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Distributes 30% of the distributable profit to creators, weighted by verified installs in the period.
        Balances under the threshold carry forward. Every run is recorded in the ledger.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card/35 p-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Period start
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Period end
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Distributable profit ($)
          <Input value={dollars} onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="1000" inputMode="decimal" className="h-9 w-36" />
        </label>
        <Button onClick={onRun} disabled={busy || !dollars || !start || !end}>Run distribution</Button>
      </div>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
      {runs.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">
                {run.periodStart.slice(0, 10)} → {run.periodEnd.slice(0, 10)} · {run.creators} creator(s) · {run.totalVerifiedInstalls} install(s)
              </span>
              <span className="tabular-nums">
                pool {money(run.creatorPoolAmount)} · paid <span className="text-emerald-500">{money(run.paid)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
