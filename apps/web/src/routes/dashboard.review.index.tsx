/* ─────────────────────────────────────────────────────────
 * REVIEW QUEUE — curator-only. Components awaiting approval.
 * ───────────────────────────────────────────────────────── */
import { useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { HiCheckCircle as CheckCircle2, HiClipboardDocumentCheck as ClipboardCheck, HiClock as Clock, HiExclamationTriangle as TriangleAlert } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { fetchReviewQueue, type ReviewListItem } from "@/lib/review";
import { listSimilarityHolds, resolveSimilarityHold, type HoldResolution, type SimilarityHold } from "@/lib/similarity";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/dashboard/review/")({
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
    if (!context.user.isCurator) throw redirect({ to: "/" });
  },
  loader: async () => {
    const [{ items }, { holds }] = await Promise.all([fetchReviewQueue(), listSimilarityHolds()]);
    return { items, holds };
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
  const { items, holds } = Route.useLoaderData();

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

      {holds.length > 0 ? <SimilarityHolds holds={holds} /> : null}
    </div>
  );
}

const RESOLUTIONS: { id: HoldResolution; label: string }[] = [
  { id: "cleared", label: "Clear → review queue" },
  { id: "authorized-derivative", label: "Authorized derivative → queue" },
  { id: "attribution-required", label: "Attribution required" },
  { id: "rejected", label: "Reject" },
  { id: "escalated", label: "Escalate" },
];

function SimilarityHolds({ holds }: { holds: SimilarityHold[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function resolve(screenId: string, resolution: HoldResolution) {
    setError("");
    if (!rationale.trim()) {
      setError("A rationale is required for every resolution.");
      return;
    }
    setBusy(true);
    const res = await resolveSimilarityHold({
      data: { screenId, resolution, rationale: rationale.trim() },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not resolve the hold.");
      return;
    }
    setOpenId(null);
    setRationale("");
    await router.invalidate();
  }

  return (
    <div className="mt-10">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <TriangleAlert className="size-4 text-ticket" /> Similarity holds
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Submissions with exact or high-confidence matches against other creators' published releases. Similarity is a
        review signal — never proof of plagiarism or originality — and screening covers only Modulora's own corpus.
        Clearing sends the submission into the normal review queue for a full alpha-1 review.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {holds.map((hold) => (
          <li key={hold.screenId} className="rounded-lg border border-border/60 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {hold.title} <span className="text-muted-foreground">{hold.ref}</span>
                  {hold.escalated ? <span className="ml-2 rounded-full border border-ticket/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ticket">Escalated</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Matches: {hold.candidates.map((candidate) => `${candidate.ref}${candidate.confidence ? ` (${candidate.confidence})` : ""}`).join(", ") || "—"}
                  {" · "}
                  {hold.classified ? "Submitter classified the matches" : "Awaiting submitter classification"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link to="/dashboard/review/$id" params={{ id: hold.componentId }} className="inline-flex min-h-9 items-center rounded-md border border-border/60 px-3 text-xs transition-colors hover:bg-secondary/50">
                  Compare
                </Link>
                <Button size="sm" variant="outline" onClick={() => setOpenId(openId === hold.screenId ? null : hold.screenId)}>
                  Resolve
                </Button>
              </div>
            </div>
            {openId === hold.screenId ? (
              <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                <textarea
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                  rows={3}
                  aria-label="Resolution rationale"
                  placeholder="Scoped rationale — recorded immutably with the resolution."
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <div className="flex flex-wrap gap-2">
                  {RESOLUTIONS.map((option) => (
                    <Button key={option.id} size="sm" variant={option.id === "rejected" ? "destructive" : "outline"} disabled={busy} onClick={() => resolve(hold.screenId, option.id)}>
                      {option.label}
                    </Button>
                  ))}
                </div>
                {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
