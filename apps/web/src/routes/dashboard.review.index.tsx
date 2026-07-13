/* ─────────────────────────────────────────────────────────
 * REVIEW QUEUE — curator-only. Components awaiting approval.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CheckCircle2, ClipboardCheck, Clock } from "lucide-react";

import { fetchReviewQueue, type ReviewListItem } from "@/lib/review";
import { createPayoutRun, listPayoutRuns, type PayoutRunSummary } from "@/lib/distribution";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/dashboard/review/")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
    if (!context.user.isCurator) throw redirect({ to: "/" });
  },
  loader: async () => {
    const { items } = await fetchReviewQueue();
    return { items };
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
  const { items } = Route.useLoaderData();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full max-w-4xl">
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
          <a href="/docs/curation" className="mt-2 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground">
            What curators check — and how roles work
          </a>
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
                to="/dashboard/review/$id"
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

    </div>
  );
}
