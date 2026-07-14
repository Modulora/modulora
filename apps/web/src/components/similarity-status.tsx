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
  files: { path: string; candidatePath: string; score: number }[];
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
}: {
  state: SimilarityDisplayState;
  candidates?: SimilarityCandidateDisplay[];
  corpusLimitation: string;
}) {
  const copy = STATE_COPY[state];
  return (
    <div data-slot="similarity-status" className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Similarity screening</p>
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {copy.label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
      {candidates.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {candidates.map((candidate) => (
            <li key={candidate.ref} className="rounded-md border border-border/50 px-3 py-2">
              <p className="text-xs font-medium">
                {candidate.ref}
                {candidate.confidence ? (
                  <span className="ml-2 uppercase tracking-wide text-muted-foreground">{candidate.confidence} match</span>
                ) : null}
              </p>
              {candidate.files.slice(0, 4).map((file) => (
                <p key={`${file.path}-${file.candidatePath}`} className="mt-0.5 truncate text-xs text-muted-foreground">
                  {file.path} ↔ {file.candidatePath} · {(file.score * 100).toFixed(0)}% shared structure
                </p>
              ))}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{corpusLimitation}</p>
    </div>
  );
}
