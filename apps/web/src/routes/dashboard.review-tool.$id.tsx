import { useMemo, useState } from "react";
import { createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { HiArrowTopRightOnSquare as External, HiCheckCircle as Check, HiClipboardDocumentCheck as Review, HiEye as Eye } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolImageCarousel } from "@/components/tool-image-carousel";
import { decideToolReview, fetchToolForReview, type ToolReviewItem } from "@/lib/tool-listings";
import { TOOL_REVIEW_CHECKS, TOOL_REVIEW_LIMITATIONS, type ToolReviewChecklist, type ToolReviewDecision } from "@/lib/tool-review-standard";

export const Route = createFileRoute("/dashboard/review-tool/$id")({
  beforeLoad: ({ context }) => { if (!context.user) throw redirect({ to: "/signin" }); if (!context.user.isCurator) throw redirect({ to: "/" }); },
  loader: async ({ params }) => { const item = await fetchToolForReview({ data: { id: params.id } }); if (!item) throw notFound(); return item; },
  component: ToolReviewPage,
});

const STEPS = ["Inspect", "Evaluate", "Decide"] as const;
const RESULTS = ["pass", "flag", "not-applicable"] as const;

function ToolReviewPage() {
  const item = Route.useLoaderData();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checklist, setChecklist] = useState<Partial<ToolReviewChecklist>>({});
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const complete = useMemo(() => TOOL_REVIEW_CHECKS.every((check) => checklist[check.id]), [checklist]);

  async function decide(decision: ToolReviewDecision) {
    if (!complete) { setError("Complete every usefulness check first."); setStep(1); return; }
    setBusy(true); setError("");
    const result = await decideToolReview({ data: { componentId: item.id, decision, rationale, checklist: checklist as ToolReviewChecklist } });
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    await navigate({ to: "/dashboard/review" });
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-2 flex gap-2"><Badge variant="outline">Tool</Badge><Badge variant="secondary">{item.pricing === "freemium" ? "Freemium" : item.pricing === "paid" ? "Paid" : "Free"}</Badge><Badge variant="secondary">Usefulness review</Badge></div><h1 className="text-2xl font-bold tracking-tight">{item.title}</h1><p className="mt-1 text-sm text-muted-foreground">@{item.namespace} · {item.siteDomain} · {item.category}</p></div><Button asChild variant="outline"><a href={item.siteUrl} target="_blank" rel="noreferrer"><External className="size-4" /> Open site</a></Button></div>

      <ol className="mb-6 grid grid-cols-3 overflow-hidden rounded-xl border border-border/60 bg-card/40">{STEPS.map((label, index) => <li key={label}><button type="button" onClick={() => setStep(index)} className={`flex min-h-12 w-full items-center justify-center gap-2 border-r border-border/60 px-3 text-sm last:border-0 ${step === index ? "bg-secondary font-medium" : "text-muted-foreground"}`}><span className="text-xs tabular-nums">{index + 1}</span>{label}</button></li>)}</ol>

      {step === 0 ? <Inspect item={item} onContinue={() => setStep(1)} /> : null}
      {step === 1 ? (
        <section className="rounded-xl border border-border/60 bg-card/40 p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><Review className="size-5" /> Evaluate usefulness</h2><p className="mt-1 text-sm text-muted-foreground">Judge the live experience and its value to catalog visitors. Metadata differences are context, not the approval standard.</p><div className="mt-6 flex flex-col gap-4">{TOOL_REVIEW_CHECKS.map((check) => <div key={check.id} className="rounded-lg border border-border/60 p-4"><p className="text-sm font-medium">{check.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.description}</p><div className="mt-3 flex flex-wrap gap-2">{RESULTS.map((result) => <Button key={result} type="button" size="sm" variant={checklist[check.id] === result ? "default" : "outline"} onClick={() => setChecklist((current) => ({ ...current, [check.id]: result }))}>{result === "not-applicable" ? "N/A" : result === "pass" ? "Pass" : "Flag"}</Button>)}</div></div>)}</div><div className="mt-6 flex justify-end"><Button type="button" disabled={!complete} onClick={() => setStep(2)}>Continue to decision</Button></div></section>
      ) : null}
      {step === 2 ? (
        <section className="rounded-xl border border-border/60 bg-card/40 p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><Check className="size-5" /> Record listing decision</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{TOOL_REVIEW_LIMITATIONS}</p><label className="mt-5 block text-sm font-medium" htmlFor="tool-review-rationale">Rationale</label><textarea id="tool-review-rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} rows={5} placeholder="Explain the concrete usefulness observed, any limitations, and why this decision fits the catalog." className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" />{error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}<div className="mt-5 flex flex-wrap gap-2"><Button disabled={busy || rationale.trim().length < 20} onClick={() => decide("approve")}>Approve listing</Button><Button variant="outline" disabled={busy || rationale.trim().length < 20} onClick={() => decide("request-changes")}>Request changes</Button><Button variant="destructive" disabled={busy || rationale.trim().length < 20} onClick={() => decide("reject")}>Reject</Button><Button variant="outline" disabled={busy || rationale.trim().length < 20} onClick={() => decide("escalate")}>Escalate</Button></div></section>
      ) : null}
    </div>
  );
}

function Inspect({ item, onContinue }: { item: ToolReviewItem; onContinue: () => void }) {
  return <section className="overflow-hidden rounded-xl border border-border/60 bg-card/40"><div className="relative aspect-[16/9] min-h-[30rem] border-b border-border/60 bg-secondary/20">{item.ogImageUrl ? <img src={item.ogImageUrl} alt="" className="absolute inset-0 size-full object-cover opacity-30" /> : null}<iframe src={item.siteUrl} title={`Curator preview of ${item.title}`} sandbox="allow-scripts" referrerPolicy="no-referrer" className="relative size-full bg-white" /></div><div className="grid gap-5 p-6 lg:grid-cols-[1fr_0.8fr]"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Eye className="size-5" /> Inspect live listing</h2><p className="mt-2 text-sm leading-relaxed">{item.description}</p><dl className="mt-5 grid gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Submitted URL</dt><dd className="break-all">{item.siteUrl}</dd></div><div><dt className="text-xs text-muted-foreground">Verified domain</dt><dd>{item.siteDomain}</dd></div></dl></div><div className="rounded-lg border border-border/60 bg-background/40 p-4"><p className="text-sm font-medium">Creator-uploaded site thumbnails</p><ToolImageCarousel images={item.showcaseImageUrls} domain={item.siteDomain} title={item.title} className="mt-3 aspect-[4/3] w-full rounded-md border border-border" /><p className="mt-4 text-sm font-medium">Fetched Open Graph metadata</p><p className="mt-2 text-sm">{item.ogTitle || "No OG title"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.ogDescription || "No OG description"}</p></div></div><div className="flex justify-end border-t border-border/60 p-4"><Button onClick={onContinue}>Evaluate usefulness</Button></div></section>;
}
