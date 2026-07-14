/* ─────────────────────────────────────────────────────────
 * REVIEW DETAIL — curator-only. Inspect a submission, approve or reject.
 * ───────────────────────────────────────────────────────── */
import { useMemo, useState } from "react";
import { createFileRoute, redirect, useRouter, useSearch, Link } from "@tanstack/react-router";
import { HiArrowLeft as ArrowLeft, HiCheck as Check, HiArrowTopRightOnSquare as ExternalLink, HiCodeBracketSquare as FileCode, HiArrowPath as Loader2, HiShieldCheck as ShieldCheck, HiXMark as X } from "react-icons/hi2";


import { Button } from "@/components/ui/button";
import { fetchComponentForReview } from "@/lib/catalog-db";
import { decideReview } from "@/lib/review";
import {
  REVIEW_CHECKS,
  REVIEW_STANDARD_LIMITATIONS,
  REVIEW_STANDARD_VERSION,
  type Checklist,
  type ChecklistResult,
  type ReviewDecision,
} from "@/lib/review-standard";
import { applySignals, signalsFromEvidence } from "@/lib/review-signals";
import { SimilarityStatusPanel } from "@/components/similarity-status";

export const Route = createFileRoute("/dashboard/review/$id")({
  validateSearch: (search: Record<string, unknown>): { action?: "approve" | "deny" } => ({
    action: search.action === "approve" || search.action === "deny" ? search.action : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
    if (!context.user.isCurator) throw redirect({ to: "/" });
  },
  loader: async ({ params }) => {
    const item = await fetchComponentForReview({ data: { id: params.id } });
    return { item };
  },
  component: ReviewDetail,
});

function ReviewDetail() {
  const { item } = Route.useLoaderData();
  const { id } = Route.useParams();
  const { action } = useSearch({ from: "/dashboard/review/$id" });
  const router = useRouter();

  const [checklist, setChecklist] = useState<Checklist>({});
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState<ReviewDecision | null>(null);
  const [error, setError] = useState("");
  const [activeFile, setActiveFile] = useState(0);

  const files = useMemo(() => item?.files ?? [], [item]);
  const signals = useMemo(() => signalsFromEvidence(item?.evidence ?? []), [item]);
  const signalCount = Object.keys(signals).length;
  const checksComplete = REVIEW_CHECKS.every((check) => checklist[check.id] !== undefined);
  const ready = checksComplete && rationale.trim().length > 0;
  void action;

  if (!item) {
    return (
      <div className="w-full max-w-2xl py-16 text-center">
        <p className="text-sm text-muted-foreground">This component is no longer in the queue.</p>
        <Link to="/dashboard/review" className="mt-4 inline-block text-sm underline">
          Back to queue
        </Link>
      </div>
    );
  }

  async function decide(decision: ReviewDecision) {
    setError("");
    if (!checksComplete) {
      setError("Every check needs an explicit result before deciding.");
      return;
    }
    if (!rationale.trim()) {
      setError("A rationale is required for every decision, including approval.");
      return;
    }
    setBusy(decision);
    const res = await decideReview({ data: { componentId: id, decision, rationale: rationale.trim(), checklist } });
    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      setBusy(null);
      return;
    }
    router.navigate({ to: "/dashboard/review" });
  }

  const file = files[activeFile];

  return (
    <div className="w-full max-w-5xl">
      <Link to="/dashboard/review" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Review queue
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Left: submission */}
        <div className="min-w-0 space-y-5">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{item.namespace}</span>
              <span>·</span>
              <span>{item.category}</span>
              <span>·</span>
              <span>{item.sourceModel === "open-source" ? "Free" : "Paid"}</span>
            </div>
            <h1 className="text-xl font-semibold">{item.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            <Link
              to="/components/$namespace/$name"
              params={{ namespace: item.namespace, name: item.name }}
              target="_blank"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Open detail view <ExternalLink className="size-3" />
            </Link>
          </div>

          {/* Code */}
          {files.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-secondary/40 px-2 py-1.5">
                {files.map((f, i) => (
                  <button
                    key={f.path}
                    type="button"
                    aria-pressed={i === activeFile}
                    onClick={() => setActiveFile(i)}
                    className={`flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      i === activeFile ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileCode className="size-3" />
                    {f.path.split("/").pop()}
                  </button>
                ))}
              </div>
              <pre className="max-h-[28rem] overflow-auto bg-code-background p-4 text-xs leading-relaxed text-code-foreground">
                <code>{file?.content}</code>
              </pre>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No source files were uploaded (external / paid listing).
            </p>
          )}

          {item.similarityScreen ? (
            <SimilarityStatusPanel
              state={item.similarityScreen.state}
              candidates={item.similarityScreen.candidates}
              corpusLimitation={item.similarityScreen.corpusLimitation}
            />
          ) : null}

          {/* Evidence */}
          {item.evidence && item.evidence.length > 0 && (
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4 text-receipt" /> Provenance &amp; integrity
              </div>
              <ul className="space-y-2">
                {item.evidence.map((e) => (
                  <li key={e.type} className="text-xs">
                    <span className="font-medium">{e.type}</span>
                    <span className="text-muted-foreground"> — {e.scope ?? e.limitations ?? e.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: standard checklist + decision */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">Review standard</p>
              <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{REVIEW_STANDARD_VERSION}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{REVIEW_STANDARD_LIMITATIONS}</p>
            {signalCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setChecklist((current) => applySignals(current, signals))}
              >
                Apply {signalCount} evidence signal{signalCount === 1 ? "" : "s"} as prefill
              </Button>
            ) : null}
            <ul className="space-y-3">
              {REVIEW_CHECKS.map((check) => (
                <li key={check.id}>
                  <p className="text-xs font-medium">{check.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{check.description}</p>
                  {signals[check.id] ? (
                    <p className={`mt-1 text-[11px] leading-snug ${signals[check.id]!.result === "flag" ? "text-ticket" : "text-muted-foreground"}`}>
                      Signal: {signals[check.id]!.reason}
                    </p>
                  ) : null}
                  <div role="radiogroup" aria-label={`${check.title} result`} className="mt-1.5 flex gap-1">
                    {(
                      [
                        ["pass", "Pass"],
                        ["flag", "Flag"],
                        ["not-applicable", "N/A"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={checklist[check.id] === value}
                        onClick={() => setChecklist((current) => ({ ...current, [check.id]: value as ChecklistResult }))}
                        className={`min-h-9 flex-1 rounded-md border px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                          checklist[check.id] === value
                            ? value === "flag"
                              ? "border-ticket/50 bg-ticket/15 text-ticket"
                              : "border-border bg-accent text-foreground"
                            : "border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Decision</p>
            <p className="text-xs text-muted-foreground">
              Every outcome — including approval — records the checklist, your rationale, and standard {REVIEW_STANDARD_VERSION} in an append-only review record.
            </p>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
              aria-label="Decision rationale"
              placeholder="Why this outcome? Creators see this verbatim on request-changes and reject."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <div className="space-y-2">
              <Button className="w-full" disabled={busy !== null || !ready} onClick={() => decide("approve")}>
                {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Approve &amp; list
              </Button>
              <Button variant="outline" className="w-full" disabled={busy !== null || !ready} onClick={() => decide("request-changes")}>
                {busy === "request-changes" ? <Loader2 className="size-4 animate-spin" /> : null}
                Request changes
              </Button>
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" disabled={busy !== null || !ready} onClick={() => decide("reject")}>
                  {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                  Reject
                </Button>
                <Button variant="ghost" className="flex-1" disabled={busy !== null || !ready} onClick={() => decide("escalate")}>
                  {busy === "escalate" ? <Loader2 className="size-4 animate-spin" /> : null}
                  Escalate
                </Button>
              </div>
            </div>
            {!ready ? (
              <p className="text-xs text-muted-foreground">
                {checksComplete ? "Add a rationale to enable decisions." : "Give every check an explicit result to enable decisions."}
              </p>
            ) : null}
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
