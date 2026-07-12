/**
 * Owner-only platform operations. Unlisted — no links point here — and
 * gated by OWNER_USER_IDS: anyone else gets a 404, so the surface doesn't
 * exist publicly. Curators do not have access; reviewing content and moving
 * money are different powers.
 */
import { useState } from "react";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { ShieldEllipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/session";
import { isOwnerUser } from "@/lib/access";
import { createPayoutRun, listPayoutRuns, type PayoutRunSummary } from "@/lib/distribution";

const fetchAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const user = request ? await getCurrentUser(request) : null;
  if (!user || !isOwnerUser(user.id)) return null;
  return { runs: await listPayoutRuns() };
});

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const data = await fetchAdmin();
    if (!data) throw notFound();
    return data;
  },
  component: AdminPage,
});

function AdminPage() {
  const { runs } = Route.useLoaderData();
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
          <ShieldEllipsis className="size-4.5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Platform operations</h1>
          <p className="text-xs text-muted-foreground">Owner-only. Nothing here is linked publicly.</p>
        </div>
      </div>

      <DistributionsSection runs={runs} />
    </div>
  );
}

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
    setMessage(
      `Run complete: ${t.creators} creator(s), ${t.installs} install(s) — pool ${money(t.pool)}, paid ${money(t.paid)}, carried ${money(t.carried)}.`,
    );
    setDollars("");
    await router.invalidate();
  }

  return (
    <div className="mt-10">
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
