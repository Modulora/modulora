/* ─────────────────────────────────────────────────────────
 * REVIEW QUEUE — curator-only. Components awaiting approval.
 * ───────────────────────────────────────────────────────── */
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, Clock } from "lucide-react";

import { fetchReviewQueue, type ReviewListItem } from "@/lib/review";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { EmptyState } from "@/components/ui/empty-state";

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

  return (
    <div className="w-full max-w-4xl">
      <DashboardPageHeader
        title="Review queue"
        icon={ClipboardCheck}
        description={`${items.length} component${items.length === 1 ? "" : "s"} awaiting a listing decision.`}
        className="mb-8"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Queue is clear"
          description="Nothing is waiting for a listing decision."
          action={<a href="/docs/curation" className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground">What curators check — and how roles work</a>}
          className="py-20"
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {items.map((item: ReviewListItem) => (
            <li key={item.id}>
              <Link
                to="/dashboard/review/$id"
                params={{ id: item.id }}
                className="flex min-h-14 items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
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
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
