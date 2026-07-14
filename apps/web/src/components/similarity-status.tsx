import { parseDiffFromFile } from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";
import { useMemo, useState } from "react";
import { registerPierreDiffThemes } from "@/lib/pierre-theme";

registerPierreDiffThemes();

/**
 * Neutral similarity / moderation status panel (#67). Presentational only —
 * no server imports — so every state renders in Storybook. Deliberately never
 * borrows success/approval styling: similarity is a signal, not a verdict.
 */
export type SimilarityDisplayState =
  | "clear"
  | "potential"
  | "blocked"
  | "authorized-derivative"
  | "under-dispute"
  | "takedown";

export interface SimilarityCandidateDisplay {
  ref: string;
  confidence: string | null;
  files: {
    path: string;
    candidatePath: string;
    score: number;
    submittedContent?: string;
    candidateContent?: string;
  }[];
}

type DiffFile = SimilarityCandidateDisplay["files"][number];

function SimilarityCodeDiff({ file, candidateRef, themeId }: { file: DiffFile; candidateRef: string; themeId: string }) {
  const [layout, setLayout] = useState<"split" | "unified">("split");
  const fileDiff = useMemo(() => {
    if (file.candidateContent === undefined || file.submittedContent === undefined) return null;
    return parseDiffFromFile(
      { name: file.candidatePath, contents: file.candidateContent },
      { name: file.path, contents: file.submittedContent },
      { context: 4 },
    );
  }, [file]);

  if (!fileDiff) {
    return <p className="border-t border-border/50 px-3 py-3 text-xs text-muted-foreground">Source comparison is unavailable for this historical match.</p>;
  }

  return (
    <div className="border-t border-border/50" data-slot="similarity-code-diff">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/25 px-3 py-2.5">
        <div>
          <p className="text-xs font-medium">Raw source comparison</p>
          <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
            Published raw source ({candidateRef}) on the left; held raw source on the right. The percentage above is normalized token similarity, not a verdict.
          </p>
        </div>
        <div className="flex rounded-md border border-border/70 p-0.5" aria-label="Diff layout">
          {(["split", "unified"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={layout === option}
              onClick={() => setLayout(option)}
              className={`min-h-11 rounded px-3 text-sm font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                layout === option ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[36rem] overflow-auto bg-code-background">
        <FileDiff
          fileDiff={fileDiff}
          disableWorkerPool
          options={{
            diffStyle: layout,
            theme: themeId,
            overflow: "scroll",
            lineDiffType: "word",
            stickyHeader: true,
          }}
        />
      </div>
      <p className="border-t border-border/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        Raw lines are rendered locally from Modulora&apos;s stored release files. Code is not sent to Diffs or another third party.
      </p>
    </div>
  );
}

const STATE_COPY: Record<SimilarityDisplayState, { label: string; body: string }> = {
  clear: {
    label: "No corpus matches",
    body: "No material similarity to other creators' published Modulora releases was detected.",
  },
  potential: {
    label: "Potential matches",
    body: "Some files partially resemble other published releases. This is a neutral signal for human review.",
  },
  blocked: {
    label: "Held for review",
    body: "Exact or high-confidence matches against another creator's published release hold this submission until a curator resolves it.",
  },
  "authorized-derivative": {
    label: "Authorized derivative",
    body: "A curator recorded this release as an authorized derivative with attribution.",
  },
  "under-dispute": {
    label: "Under dispute",
    body: "An open moderation case concerns this listing. A dispute is not a finding against anyone.",
  },
  takedown: {
    label: "Removed",
    body: "This listing was removed following a moderation decision. Removal reflects a listing decision on a specific report, not a legal or factual finding.",
  },
};

export function SimilarityStatusPanel({
  state,
  candidates = [],
  corpusLimitation,
  themeId = "pierre-dark",
}: {
  state: SimilarityDisplayState;
  candidates?: SimilarityCandidateDisplay[];
  corpusLimitation: string;
  themeId?: string;
}) {
  const copy = STATE_COPY[state];
  const firstComparable = candidates.flatMap((candidate) =>
    candidate.files
      .filter((file) => file.submittedContent !== undefined && file.candidateContent !== undefined)
      .map((file) => `${candidate.ref}:${file.path}:${file.candidatePath}`),
  )[0];
  const [openDiff, setOpenDiff] = useState<string | null>(firstComparable ?? null);
  return (
    <div data-slot="similarity-status" className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Similarity screening</p>
        <span className="rounded-full border border-border/60 px-2 py-1 text-xs font-medium text-muted-foreground">
          {copy.label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
      {candidates.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {candidates.map((candidate) => (
            <li key={candidate.ref} className="overflow-hidden rounded-md border border-border/50">
              <div className="px-3 py-2">
                <p className="text-xs font-medium">
                  {candidate.ref}
                  {candidate.confidence ? (
                    <span className="ml-2 uppercase tracking-wide text-muted-foreground">{candidate.confidence} match</span>
                  ) : null}
                </p>
              </div>
              {candidate.files.slice(0, 4).map((file) => {
                const key = `${candidate.ref}:${file.path}:${file.candidatePath}`;
                const comparable = file.submittedContent !== undefined && file.candidateContent !== undefined;
                const expanded = openDiff === key;
                return (
                  <div key={key} className="border-t border-border/40">
                    <button
                      type="button"
                      disabled={!comparable}
                      aria-expanded={comparable ? expanded : undefined}
                      onClick={() => setOpenDiff(expanded ? null : key)}
                      className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-secondary/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 disabled:cursor-default"
                    >
                      <span className="min-w-0 truncate font-mono">
                        {file.path} ↔ {file.candidatePath}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {(file.score * 100).toFixed(0)}% normalized · {comparable ? (expanded ? "Hide raw diff" : "View raw diff") : "Raw source unavailable"}
                      </span>
                    </button>
                    {expanded ? <SimilarityCodeDiff file={file} candidateRef={candidate.ref} themeId={themeId} /> : null}
                  </div>
                );
              })}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">{corpusLimitation}</p>
    </div>
  );
}
