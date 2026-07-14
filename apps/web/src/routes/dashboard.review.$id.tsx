/* ─────────────────────────────────────────────────────────
 * REVIEW DETAIL — guided curator workflow.
 * Inspect the record, evaluate every alpha-1 check, then decide.
 * ───────────────────────────────────────────────────────── */
import { useMemo, useRef, useState } from "react";
import { createFileRoute, redirect, useRouter, useSearch, Link } from "@tanstack/react-router";
import {
  HiArrowLeft as ArrowLeft,
  HiArrowRight as ArrowRight,
  HiArrowTopRightOnSquare as ExternalLink,
  HiCheck as Check,
  HiCheckCircle as CheckCircle,
  HiClipboardDocumentCheck as EvaluateIcon,
  HiCodeBracketSquare as FileCode,
  HiEye as InspectIcon,
  HiLockClosed as Lock,
  HiArrowPath as Loader2,
  HiScale as DecisionIcon,
  HiShieldCheck as ShieldCheck,
  HiXMark as X,
} from "react-icons/hi2";

import { CodeEditor } from "@/components/code-editor";
import { ComponentSandbox } from "@/components/component-sandbox";
import { PreviewToolbar, type PreviewViewport } from "@/components/preview-toolbar";
import { SimilarityStatusPanel } from "@/components/similarity-status";
import { Button } from "@/components/ui/button";
import { isPaidCatalogItem, needsInteractionHint } from "@/data/catalog";
import { fetchComponentForReview } from "@/lib/catalog-db";
import { resolvePierreCodeTheme, type ColorVisionMode } from "@/lib/pierre-theme";
import { usePageTheme } from "@/lib/use-page-theme";
import { decideReview } from "@/lib/review";
import { applySignals, signalsFromEvidence } from "@/lib/review-signals";
import {
  REVIEW_CHECKS,
  REVIEW_STANDARD_LIMITATIONS,
  REVIEW_STANDARD_VERSION,
  type Checklist,
  type ChecklistResult,
  type ReviewDecision,
} from "@/lib/review-standard";

type ReviewStep = "inspect" | "evaluate" | "decide";
type InspectTab = "preview" | "source" | "similarity" | "evidence";

export const Route = createFileRoute("/dashboard/review/$id")({
  validateSearch: (search: Record<string, unknown>): { action?: "approve" | "deny" } => ({
    action: search.action === "approve" || search.action === "deny" ? search.action : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/signin" });
    if (!context.user.isCurator) throw redirect({ to: "/" });
  },
  loader: async ({ params, context }) => {
    const item = await fetchComponentForReview({ data: { id: params.id } });
    return { item, colorVisionMode: (context.user?.colorVisionMode ?? "standard") as ColorVisionMode };
  },
  component: ReviewDetail,
});

function ReviewDetail() {
  const { item, colorVisionMode } = Route.useLoaderData();
  const { id } = Route.useParams();
  const { action } = useSearch({ from: "/dashboard/review/$id" });
  const router = useRouter();
  const pageTheme = usePageTheme();
  const viewerTheme = resolvePierreCodeTheme(pageTheme, colorVisionMode);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const signals = useMemo(() => signalsFromEvidence(item?.evidence ?? []), [item]);

  const [step, setStep] = useState<ReviewStep>("inspect");
  const [inspectTab, setInspectTab] = useState<InspectTab>("preview");
  const [checklist, setChecklist] = useState<Checklist>(() => applySignals({}, signals));
  const [activeCheck, setActiveCheck] = useState<string | null>(REVIEW_CHECKS[0]!.id);
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState<ReviewDecision | null>(null);
  const [error, setError] = useState("");
  const [activeFile, setActiveFile] = useState(0);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">(pageTheme);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>("desktop");
  const [previewKey, setPreviewKey] = useState(0);

  const files = useMemo(() => item?.files ?? [], [item]);
  const demos = useMemo(() => files.filter((entry) => /(^|\/)demos\/.+\.(tsx|jsx)$/.test(entry.path)), [files]);
  const interactionOnlyPreview = useMemo(() => needsInteractionHint(files), [files]);
  const [selectedDemo, setSelectedDemo] = useState(() => demos[0]?.path ?? "");
  const signalCount = Object.keys(signals).length;
  const completedChecks = REVIEW_CHECKS.filter((check) => checklist[check.id] !== undefined).length;
  const checksComplete = completedChecks === REVIEW_CHECKS.length;
  const ready = checksComplete && rationale.trim().length > 0;
  const flaggedChecks = REVIEW_CHECKS.filter((check) => checklist[check.id] === "flag").length;
  void action;

  if (!item) {
    return (
      <div className="w-full max-w-2xl py-16 text-center">
        <p className="text-sm text-muted-foreground">This component is no longer in the queue.</p>
        <Link to="/dashboard/review" className="mt-4 inline-block text-sm underline">
          Back to review queue
        </Link>
      </div>
    );
  }

  async function decide(decision: ReviewDecision) {
    setError("");
    if (!checksComplete) {
      setError("Give every check an explicit result before recording a decision.");
      setStep("evaluate");
      return;
    }
    if (!rationale.trim()) {
      setError("Explain the decision before recording it. This rationale becomes part of the review record.");
      return;
    }
    setBusy(decision);
    const res = await decideReview({ data: { componentId: id, decision, rationale: rationale.trim(), checklist } });
    if (!res.ok) {
      setError(res.error ?? "The decision was not recorded. Try again.");
      setBusy(null);
      return;
    }
    router.navigate({ to: "/dashboard/review" });
  }

  function chooseResult(checkId: (typeof REVIEW_CHECKS)[number]["id"], result: ChecklistResult) {
    setChecklist((current) => ({ ...current, [checkId]: result }));
  }

  function applyEvidenceSignals() {
    const next = applySignals(checklist, signals);
    setChecklist(next);
    const firstUnanswered = REVIEW_CHECKS.find((check) => next[check.id] === undefined);
    if (firstUnanswered) setActiveCheck(firstUnanswered.id);
  }

  const file = files[activeFile];
  const paid = isPaidCatalogItem(item);

  return (
    <main className="w-full max-w-5xl pb-16" aria-labelledby="review-title">
      <Link
        to="/dashboard/review"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" /> Review queue
      </Link>

      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">@{item.namespace}/{item.name}</span>
            <span aria-hidden="true">·</span>
            <span>{item.category}</span>
            <span aria-hidden="true">·</span>
            <span className={paid ? "text-ticket" : undefined}>{paid ? "Paid" : "Free"}</span>
            {item.similarityScreen?.state === "blocked" ? (
              <><span aria-hidden="true">·</span><span className="font-medium text-foreground">Held for similarity review</span></>
            ) : null}
          </div>
          <h1 id="review-title" className="mt-2 text-xl font-semibold tracking-tight">{item.title}</h1>
          <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
        <Link
          to="/components/$namespace/$name"
          params={{ namespace: item.namespace, name: item.name }}
          target="_blank"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-md border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-secondary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Open listing <ExternalLink className="size-4" />
        </Link>
      </header>

      <ReviewProgress step={step} completedChecks={completedChecks} checksComplete={checksComplete} onStepChange={setStep} />

      {step === "inspect" ? (
        <section aria-labelledby="inspect-heading" className="pt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Step 1 of 3</p>
              <h2 id="inspect-heading" className="mt-1 text-xl font-semibold">Inspect the submission</h2>
              <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
                Compare the submitted files with the evidence and any corpus matches before evaluating the standard.
              </p>
            </div>
            <p className="shrink-0 font-mono text-xs text-muted-foreground">Theme: {viewerTheme}</p>
          </div>

          <div className="mt-6 flex overflow-x-auto border-b border-border" role="tablist" aria-label="Inspection record">
            {(
              [
                ["preview", demos.length > 0 ? `Preview · ${demos.length}` : "Preview"],
                ["source", `Source · ${files.length}`],
                ["similarity", item.similarityScreen ? "Similarity · 1" : "Similarity · 0"],
                ["evidence", `Evidence · ${item.evidence.length}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`inspect-tab-${value}`}
                aria-controls={`inspect-panel-${value}`}
                aria-selected={inspectTab === value}
                tabIndex={inspectTab === value ? 0 : -1}
                onClick={() => setInspectTab(value)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const tabs: InspectTab[] = ["preview", "source", "similarity", "evidence"];
                  const current = tabs.indexOf(inspectTab);
                  const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : event.key === "ArrowRight" ? (current + 1) % tabs.length : (current - 1 + tabs.length) % tabs.length;
                  const next = tabs[nextIndex]!;
                  setInspectTab(next);
                  requestAnimationFrame(() => document.getElementById(`inspect-tab-${next}`)?.focus());
                }}
                className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 ${
                  inspectTab === value ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div id={`inspect-panel-${inspectTab}`} role="tabpanel" aria-labelledby={`inspect-tab-${inspectTab}`} tabIndex={0} className="pt-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            {inspectTab === "preview" ? (
              demos.length > 0 && selectedDemo ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="flex flex-col gap-3 border-b border-border bg-secondary/30 p-2 sm:flex-row sm:items-center sm:justify-between">
                    {demos.length > 1 ? (
                      <select
                        value={selectedDemo}
                        onChange={(event) => setSelectedDemo(event.target.value)}
                        aria-label="Preview variant"
                        className="h-11 rounded-md border border-border bg-background px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        {demos.map((demo) => <option key={demo.path} value={demo.path}>{demo.path}</option>)}
                      </select>
                    ) : <span className="px-2 font-mono text-xs text-muted-foreground">{selectedDemo}</span>}
                    <PreviewToolbar
                      theme={previewTheme}
                      onTheme={setPreviewTheme}
                      viewport={previewViewport}
                      onViewport={setPreviewViewport}
                      onRefresh={() => setPreviewKey((current) => current + 1)}
                      onFullscreen={() => void previewStageRef.current?.requestFullscreen()}
                    />
                  </div>
                  <div ref={previewStageRef} className={`flex h-[34rem] max-h-[70vh] justify-center overflow-auto bg-code-background ${previewTheme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"}`}>
                    <div className={`h-full w-full ${previewViewport === "mobile" ? "max-w-[390px]" : previewViewport === "tablet" ? "max-w-[768px]" : "max-w-none"}`}>
                      <ComponentSandbox
                        key={`${previewKey}-${selectedDemo}`}
                        files={files}
                        selectedDemo={selectedDemo}
                        theme={previewTheme}
                        className="h-full w-full"
                        interactionHint={interactionOnlyPreview ? "Move your pointer inside · click to trigger the effect" : undefined}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8">
                  <p className="text-sm font-medium">No authored preview was supplied</p>
                  <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
                    Review the hosted files directly. Modulora does not generate a substitute preview that could misrepresent the creator&apos;s component.
                  </p>
                </div>
              )
            ) : null}

            {inspectTab === "source" ? (
              files.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-secondary/30 p-2">
                    {files.map((sourceFile, index) => (
                      <button
                        key={sourceFile.path}
                        type="button"
                        aria-pressed={index === activeFile}
                        onClick={() => setActiveFile(index)}
                        className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                          index === activeFile ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FileCode className="size-4" /> {sourceFile.path}
                      </button>
                    ))}
                  </div>
                  <div className="h-[34rem] max-h-[70vh] overflow-hidden bg-code-background">
                    {file ? <CodeEditor key={file.path} path={file.path} value={file.content} themeId={viewerTheme} readOnly /> : null}
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
                  This external or paid listing does not include hosted source files.
                </p>
              )
            ) : null}

            {inspectTab === "similarity" ? (
              item.similarityScreen ? (
                <SimilarityStatusPanel
                  state={item.similarityScreen.state}
                  candidates={item.similarityScreen.candidates}
                  corpusLimitation={item.similarityScreen.corpusLimitation}
                  themeId={viewerTheme}
                />
              ) : (
                <p className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
                  No similarity screening record is available for this release.
                </p>
              )
            ) : null}

            {inspectTab === "evidence" ? (
              item.evidence.length > 0 ? (
                <ul className="divide-y divide-border/60 rounded-lg border border-border">
                  {item.evidence.map((evidence) => (
                    <li key={`${evidence.type}-${evidence.timestamp}`} className="flex gap-3 p-4">
                      <ShieldCheck className={`mt-0.5 size-5 shrink-0 ${evidence.status === "passed" ? "text-receipt" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="text-sm font-medium">{evidence.type}</p>
                          <span className="text-xs text-muted-foreground">{evidence.status}</span>
                        </div>
                        <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
                          {evidence.scope ?? evidence.limitations ?? `Issued by ${evidence.issuer}.`}
                        </p>
                        {evidence.toolVersion ? <p className="mt-2 font-mono text-xs text-muted-foreground">{evidence.toolVersion}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
                  No automated evidence records were attached to this release.
                </p>
              )
            ) : null}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setStep("evaluate")}>
              Continue to evaluation <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "evaluate" ? (
        <section aria-labelledby="evaluate-heading" className="pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Step 2 of 3</p>
              <h2 id="evaluate-heading" className="mt-1 text-xl font-semibold">Evaluate against {REVIEW_STANDARD_VERSION}</h2>
              <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
                Record an explicit result for every check. Evidence can prefill facts, but it cannot make the listing decision.
              </p>
            </div>
            <div className="shrink-0 text-sm font-medium tabular-nums">{completedChecks} of {REVIEW_CHECKS.length} complete</div>
          </div>

          <details className="mt-4 rounded-lg bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            <summary className="min-h-6 cursor-pointer font-medium text-foreground">What this review does—and does not—establish</summary>
            <p className="mt-2 max-w-[70ch] leading-relaxed">{REVIEW_STANDARD_LIMITATIONS}</p>
          </details>

          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
            <div className="h-full bg-foreground transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${(completedChecks / REVIEW_CHECKS.length) * 100}%` }} />
          </div>

          {signalCount > 0 ? (
            <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Evidence can prefill {signalCount} check{signalCount === 1 ? "" : "s"}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Review the resulting values before continuing; judgment checks remain manual.</p>
              </div>
              <Button type="button" variant="outline" className="shrink-0" onClick={applyEvidenceSignals}>Reapply evidence prefill</Button>
            </div>
          ) : null}

          <ol className="mt-6 divide-y divide-border/60 border-y border-border/70">
            {REVIEW_CHECKS.map((check, index) => {
              const result = checklist[check.id];
              const expanded = activeCheck === check.id;
              const signal = signals[check.id];
              return (
                <li key={check.id}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setActiveCheck(expanded ? null : check.id)}
                    className="flex min-h-16 w-full items-center gap-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
                  >
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${result ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}>
                      {result ? <Check className="size-4" /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{check.title}</span>
                      {!expanded ? <span className="mt-1 block truncate text-xs text-muted-foreground">{result ? resultLabel(result) : "Not evaluated"}</span> : null}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">{expanded ? "Collapse" : "Review"}</span>
                  </button>

                  {expanded ? (
                    <div className="pb-5 pl-11">
                      <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground">{check.description}</p>
                      {signal ? (
                        <div className="mt-3 rounded-md bg-secondary/35 px-3 py-2 text-sm leading-relaxed">
                          <span className="font-medium">Evidence signal: {resultLabel(signal.result)}</span>
                          <span className="text-muted-foreground"> — {signal.reason}</span>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">No automated signal. This check requires curator judgment.</p>
                      )}
                      <div role="radiogroup" aria-label={`${check.title} result`} className="mt-4 flex flex-col gap-2 sm:flex-row">
                        {(
                          [
                            ["pass", "Pass"],
                            ["flag", "Flag for concern"],
                            ["not-applicable", "Not applicable"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={result === value}
                            tabIndex={result ? (result === value ? 0 : -1) : value === "pass" ? 0 : -1}
                            onClick={() => chooseResult(check.id, value)}
                            onKeyDown={(event) => {
                              if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
                              event.preventDefault();
                              const values: ChecklistResult[] = ["pass", "flag", "not-applicable"];
                              const current = Math.max(0, values.indexOf(result ?? "pass"));
                              const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
                              const next = values[(current + (forward ? 1 : -1) + values.length) % values.length]!;
                              const group = event.currentTarget.closest('[role="radiogroup"]');
                              chooseResult(check.id, next);
                              requestAnimationFrame(() => {
                                (group?.querySelector(`[aria-checked="true"]`) as HTMLElement | null)?.focus();
                              });
                            }}
                            className={`min-h-11 flex-1 rounded-md border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] motion-reduce:active:scale-100 ${
                              result === value ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-secondary/35 hover:text-foreground"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setStep("inspect")}><ArrowLeft className="size-4" /> Back to inspection</Button>
            <Button disabled={!checksComplete} onClick={() => setStep("decide")}>
              {checksComplete ? "Continue to decision" : `${REVIEW_CHECKS.length - completedChecks} checks remaining`}
              {checksComplete ? <ArrowRight className="size-4" /> : <Lock className="size-4" />}
            </Button>
          </div>
        </section>
      ) : null}

      {step === "decide" ? (
        <section aria-labelledby="decide-heading" className="pt-8">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Step 3 of 3</p>
            <h2 id="decide-heading" className="mt-1 text-xl font-semibold">Record the listing decision</h2>
            <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
              The checklist, rationale, reviewer, release, timestamp, and standard version become an append-only review record.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-border/70 py-4 text-sm">
            <span><strong>{completedChecks}</strong> checks recorded</span>
            <span><strong>{flaggedChecks}</strong> flagged</span>
            <span className="font-mono text-muted-foreground">{REVIEW_STANDARD_VERSION}</span>
          </div>

          <div className="mt-6 max-w-3xl">
            <label htmlFor="review-rationale" className="text-sm font-medium">Decision rationale</label>
            <p id="review-rationale-help" className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
              Explain what the evidence and manual review support. Creators receive this text verbatim for change requests and rejections.
            </p>
            <textarea
              id="review-rationale"
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
              rows={7}
              aria-describedby="review-rationale-help"
              placeholder="Record the specific evidence, limitations, and reasoning behind this outcome."
              className="mt-3 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}

          <div className="mt-6 border-t border-border/70 pt-6">
            <p className="text-sm font-medium">Choose an outcome</p>
            <p className="mt-1 text-sm text-muted-foreground">Approval is a scoped listing decision—not an originality, security, accessibility, ownership, or legal certification.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button disabled={busy !== null || !ready} onClick={() => decide("approve")}>
                {busy === "approve" ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle className="size-4" />}
                Approve and list
              </Button>
              <Button variant="outline" disabled={busy !== null || !ready} onClick={() => decide("request-changes")}>
                {busy === "request-changes" ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : null}
                Request changes
              </Button>
              <Button variant="destructive" disabled={busy !== null || !ready} onClick={() => decide("reject")}>
                {busy === "reject" ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <X className="size-4" />}
                Reject listing
              </Button>
              <Button variant="ghost" disabled={busy !== null || !ready} onClick={() => decide("escalate")}>
                {busy === "escalate" ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : null}
                Escalate review
              </Button>
            </div>
            {!ready ? <p className="mt-3 text-sm text-muted-foreground">Add a rationale to enable the decision controls.</p> : null}
          </div>

          <div className="mt-8">
            <Button variant="ghost" onClick={() => setStep("evaluate")}><ArrowLeft className="size-4" /> Back to evaluation</Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ReviewProgress({
  step,
  completedChecks,
  checksComplete,
  onStepChange,
}: {
  step: ReviewStep;
  completedChecks: number;
  checksComplete: boolean;
  onStepChange: (step: ReviewStep) => void;
}) {
  const steps = [
    { id: "inspect" as const, label: "Inspect", detail: "Preview, files, evidence", icon: InspectIcon, enabled: true },
    { id: "evaluate" as const, label: "Evaluate", detail: `${completedChecks}/${REVIEW_CHECKS.length} checks`, icon: EvaluateIcon, enabled: true },
    { id: "decide" as const, label: "Decide", detail: checksComplete ? "Ready" : "Locked", icon: DecisionIcon, enabled: checksComplete },
  ];

  return (
    <nav aria-label="Review progress" className="mt-6 grid overflow-hidden rounded-lg border border-border sm:grid-cols-3">
      {steps.map((entry, index) => {
        const Icon = entry.icon;
        const active = step === entry.id;
        return (
          <button
            key={entry.id}
            type="button"
            disabled={!entry.enabled}
            aria-current={active ? "step" : undefined}
            onClick={() => onStepChange(entry.id)}
            className={`flex min-h-16 items-center gap-3 px-4 text-left focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:border-l sm:first:border-l-0 ${
              index > 0 ? "border-t border-border sm:border-t-0" : ""
            } ${active ? "bg-secondary/55 text-foreground" : "text-muted-foreground hover:bg-secondary/25 hover:text-foreground"}`}
          >
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
              {entry.enabled ? <Icon className="size-4" /> : <Lock className="size-4" />}
            </span>
            <span>
              <span className="block text-sm font-medium">{entry.label}</span>
              <span className="mt-1 block text-xs">{entry.detail}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function resultLabel(result: ChecklistResult): string {
  if (result === "pass") return "Pass";
  if (result === "flag") return "Flag for concern";
  return "Not applicable";
}
