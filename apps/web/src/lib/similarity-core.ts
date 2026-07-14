/**
 * Similarity screening engine (#67). Pure and presentational-safe: no server
 * imports, fully deterministic, so the gate, curator UI, and tests share it.
 *
 * Honesty contract: similarity is a REVIEW SIGNAL. Nothing here proves
 * plagiarism or originality, and every result carries the corpus limitation.
 */

export const SIMILARITY_METHOD_VERSION = "sim-alpha-1";

export const SIMILARITY_CORPUS_LIMITATION =
  "Screening compares this submission against Modulora's own published release corpus using exact digests and normalized token fingerprints. It does not search external sources and cannot prove plagiarism or originality.";

/** Shared scaffolding never scores decisively: everyone legitimately ships these. */
const SCAFFOLDING_PATTERNS: readonly RegExp[] = [
  /(^|\/)lib\/utils\.(ts|tsx|js)$/,
  /(^|\/)utils\.(ts|tsx|js)$/,
  /(^|\/)index\.css$/,
  /(^|\/)globals\.css$/,
  /(^|\/)styles\.css$/,
  /(^|\/)package\.json$/,
  /(^|\/)tsconfig[^/]*\.json$/,
  /(^|\/)components\.json$/,
];

export function isScaffoldingPath(path: string): boolean {
  return SCAFFOLDING_PATTERNS.some((pattern) => pattern.test(path.trim()));
}

/** Comment- and whitespace-insensitive source view for renamed/reformatted copies. */
export function normalizeSource(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/["'`]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Deterministic 32-bit FNV-1a — stable across runtimes, no crypto needed. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const SHINGLE_SIZE = 8;

export interface Fingerprint {
  /** Normalized-content hash: equal means a formatting/comment-only copy. */
  normalizedHash: number;
  /** Token-shingle hashes → the 1-based source line where the shingle starts. */
  shingles: Map<number, number>;
  tokenCount: number;
}

function tokensWithLines(content: string): { token: string; line: number }[] {
  const out: { token: string; line: number }[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const normalized = normalizeSource(lines[i]!);
    if (!normalized) continue;
    for (const token of normalized.split(/[^A-Za-z0-9_$"]+/).filter(Boolean)) {
      out.push({ token, line: i + 1 });
    }
  }
  return out;
}

export function fingerprint(content: string): Fingerprint {
  const tokens = tokensWithLines(content);
  const shingles = new Map<number, number>();
  for (let i = 0; i + SHINGLE_SIZE <= tokens.length; i++) {
    const shingle = tokens.slice(i, i + SHINGLE_SIZE).map((t) => t.token).join("\u0000");
    const hash = fnv1a(shingle);
    if (!shingles.has(hash)) shingles.set(hash, tokens[i]!.line);
  }
  return { normalizedHash: fnv1a(normalizeSource(content)), shingles, tokenCount: tokens.length };
}

export interface MatchedRegion {
  /** 1-based line range in the submitted file. */
  startLine: number;
  endLine: number;
}

export interface FileComparison {
  /** Jaccard similarity of token shingles, 0..1. */
  score: number;
  /** True when normalized content is identical (formatting-only copy). */
  normalizedIdentical: boolean;
  matchedRegions: MatchedRegion[];
}

export function compareFiles(submitted: Fingerprint, candidate: Fingerprint): FileComparison {
  if (submitted.shingles.size === 0 || candidate.shingles.size === 0) {
    return {
      score: submitted.normalizedHash === candidate.normalizedHash ? 1 : 0,
      normalizedIdentical: submitted.normalizedHash === candidate.normalizedHash,
      matchedRegions: [],
    };
  }
  let shared = 0;
  const sharedLines: number[] = [];
  for (const [hash, line] of submitted.shingles) {
    if (candidate.shingles.has(hash)) {
      shared++;
      sharedLines.push(line);
    }
  }
  const union = submitted.shingles.size + candidate.shingles.size - shared;
  sharedLines.sort((a, b) => a - b);
  const matchedRegions: MatchedRegion[] = [];
  for (const line of sharedLines) {
    const last = matchedRegions[matchedRegions.length - 1];
    if (last && line <= last.endLine + 2) last.endLine = Math.max(last.endLine, line);
    else matchedRegions.push({ startLine: line, endLine: line });
  }
  return {
    score: union === 0 ? 0 : shared / union,
    normalizedIdentical: submitted.normalizedHash === candidate.normalizedHash,
    matchedRegions,
  };
}

export type MatchConfidence = "exact" | "high" | "potential";

export interface FileMatch {
  path: string;
  candidatePath: string;
  score: number;
  confidence: MatchConfidence;
  scaffolding: boolean;
  matchedRegions: MatchedRegion[];
}

export interface CandidateInput {
  /** Identifies the corpus release the files came from. */
  componentId: string;
  componentVersionId: string;
  ref: string;
  ownerUserId: string;
  files: { path: string; content: string; sha256: string }[];
}

export interface ScreenCandidate {
  componentId: string;
  componentVersionId: string;
  ref: string;
  ownerUserId: string;
  matches: FileMatch[];
  /** Highest decisive (non-scaffolding) confidence for this candidate. */
  confidence: MatchConfidence | null;
}

export type ScreenStatus = "clear" | "potential" | "blocked";

export interface ScreenResult {
  status: ScreenStatus;
  methodVersion: string;
  corpusLimitation: string;
  candidates: ScreenCandidate[];
}

export const HIGH_CONFIDENCE_THRESHOLD = 0.9;
export const POTENTIAL_THRESHOLD = 0.6;

function confidenceFor(exact: boolean, comparison: FileComparison): MatchConfidence | null {
  if (exact) return "exact";
  if (comparison.normalizedIdentical || comparison.score >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (comparison.score >= POTENTIAL_THRESHOLD) return "potential";
  return null;
}

const RANK: Record<MatchConfidence, number> = { potential: 1, high: 2, exact: 3 };

/**
 * Screen submitted files against corpus candidates from OTHER owners.
 * Exact/high-confidence matches on decisive (non-scaffolding) files block
 * automatic queue entry until a curator resolves them.
 */
export function screenSubmission(
  submission: { ownerUserId: string; files: { path: string; content: string; sha256: string }[] },
  corpus: CandidateInput[],
): ScreenResult {
  const submitted = submission.files.map((file) => ({
    ...file,
    scaffolding: isScaffoldingPath(file.path),
    fingerprint: fingerprint(file.content),
  }));
  const candidates: ScreenCandidate[] = [];

  for (const candidate of corpus) {
    if (candidate.ownerUserId === submission.ownerUserId) continue;
    const matches: FileMatch[] = [];
    for (const file of submitted) {
      for (const candidateFile of candidate.files) {
        const exact = file.sha256.length > 0 && file.sha256 === candidateFile.sha256;
        const comparison = compareFiles(file.fingerprint, fingerprint(candidateFile.content));
        const confidence = confidenceFor(exact, comparison);
        if (!confidence) continue;
        matches.push({
          path: file.path,
          candidatePath: candidateFile.path,
          score: exact ? 1 : Math.round(comparison.score * 1000) / 1000,
          confidence,
          scaffolding: file.scaffolding || isScaffoldingPath(candidateFile.path),
          matchedRegions: comparison.matchedRegions.slice(0, 20),
        });
      }
    }
    if (matches.length === 0) continue;
    const decisive = matches.filter((match) => !match.scaffolding);
    const confidence = decisive.length
      ? decisive.reduce<MatchConfidence>((max, match) => (RANK[match.confidence] > RANK[max] ? match.confidence : max), "potential")
      : null;
    candidates.push({
      componentId: candidate.componentId,
      componentVersionId: candidate.componentVersionId,
      ref: candidate.ref,
      ownerUserId: candidate.ownerUserId,
      matches: matches.sort((a, b) => b.score - a.score).slice(0, 20),
      confidence,
    });
  }

  candidates.sort((a, b) => (RANK[b.confidence ?? "potential"] ?? 0) - (RANK[a.confidence ?? "potential"] ?? 0));
  const worst = candidates.reduce<MatchConfidence | null>(
    (max, candidate) => (candidate.confidence && (!max || RANK[candidate.confidence] > RANK[max]) ? candidate.confidence : max),
    null,
  );
  return {
    status: worst === "exact" || worst === "high" ? "blocked" : worst === "potential" ? "potential" : "clear",
    methodVersion: SIMILARITY_METHOD_VERSION,
    corpusLimitation: SIMILARITY_CORPUS_LIMITATION,
    candidates: candidates.slice(0, 10),
  };
}

/** Submitter's classification of a material match — a claim, never a verdict. */
export const MATCH_CLASSIFICATIONS = [
  { id: "original", label: "My original work" },
  { id: "authorized", label: "Authorized republication" },
  { id: "derivative", label: "Fork / derivative with attribution" },
  { id: "false-positive", label: "False positive" },
] as const;
export type MatchClassification = (typeof MATCH_CLASSIFICATIONS)[number]["id"];
