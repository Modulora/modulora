/* ─────────────────────────────────────────────────────────
 * REVIEW DETAIL — curator-only. Inspect a submission, approve or reject.
 * ───────────────────────────────────────────────────────── */
import { useMemo, useState } from "react";
import { createFileRoute, redirect, useRouter, useSearch, Link } from "@tanstack/react-router";
import { HiArrowLeft as ArrowLeft, HiCheck as Check, HiArrowTopRightOnSquare as ExternalLink, HiCodeBracketSquare as FileCode, HiArrowPath as Loader2, HiShieldCheck as ShieldCheck, HiXMark as X } from "react-icons/hi2";


import { Button } from "@/components/ui/button";
import { fetchComponentForReview } from "@/lib/catalog-db";
import { decideReview } from "@/lib/review";

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

  const [rejecting, setRejecting] = useState(action === "deny");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [activeFile, setActiveFile] = useState(0);

  const files = useMemo(() => item?.files ?? [], [item]);

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

  async function decide(decision: "approve" | "reject") {
    setError("");
    if (decision === "reject" && !reason.trim()) {
      setError("Add a short reason so the creator can fix it.");
      return;
    }
    setBusy(decision);
    const res = await decideReview({ data: { componentId: id, decision, reason: reason.trim() } });
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

        {/* Right: decision */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Decision</p>
            <p className="text-xs text-muted-foreground">
              Approving lists this publicly. Rejecting sends it back to the creator with your reason.
            </p>

            {rejecting ? (
              <div className="space-y-2">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="What needs to change before this can be listed?"
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <div className="flex gap-2">
                  <Button variant="destructive" className="flex-1" disabled={busy !== null} onClick={() => decide("reject")}>
                    {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                    Confirm reject
                  </Button>
                  <Button variant="ghost" disabled={busy !== null} onClick={() => setRejecting(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button className="w-full" disabled={busy !== null} onClick={() => decide("approve")}>
                  {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Approve &amp; list
                </Button>
                <Button variant="outline" className="w-full" disabled={busy !== null} onClick={() => setRejecting(true)}>
                  <X className="size-4" /> Reject
                </Button>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
