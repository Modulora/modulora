/**
 * The versioned component review standard. Presentational-safe (no server
 * imports) so the curator review page, docs, and tests all render the same
 * source of truth. Every decision records which version it applied.
 *
 * This is a LISTING standard: approval is a scoped listing decision, never a
 * security, ownership, originality, accessibility, or legal certification.
 */

export const REVIEW_STANDARD_VERSION = "alpha-1";

export const REVIEW_STANDARD_LIMITATIONS =
  "Approval is a listing decision against the checks below. It is not a security audit, ownership or originality certification, accessibility certification, or legal review, and it cannot guarantee code is safe, original, or licensed correctly in every jurisdiction.";

export interface ReviewCheck {
  id: string;
  title: string;
  /** What the curator actually verifies — shown verbatim on the review page. */
  description: string;
}

export const REVIEW_CHECKS: readonly ReviewCheck[] = [
  {
    id: "publisher-association",
    title: "Publisher & association",
    description:
      "The authenticated publisher's identity is scoped correctly; the listing makes no unauthorized creator, brand, repository, preview, or affiliation claim.",
  },
  {
    id: "authorization-attribution",
    title: "Authorization & attribution",
    description:
      "Original URL, inspiration, fork/derivative, and license/attribution claims are internally consistent. Similarity is a review signal, never proof of plagiarism or originality.",
  },
  {
    id: "listing-accuracy",
    title: "Listing accuracy",
    description:
      "Title, description, taxonomy, framework, demo, files, dependencies, and stated behavior agree with each other.",
  },
  {
    id: "artifact-integrity",
    title: "Artifact integrity",
    description:
      "Exact files, digest, registry shape, path sanitization, and distribution-channel output are present and internally consistent.",
  },
  {
    id: "install-behavior",
    title: "Install behavior",
    description:
      "Install paths copy files only. Parity evidence and its limitations are shown; unverifiable creator commands remain labeled unverifiable.",
  },
  {
    id: "risk-indicators",
    title: "Risk indicators",
    description:
      "Automated secret-scan and other scoped evidence reviewed, plus obvious executable, network, or data-exfiltration behavior. Not a security guarantee.",
  },
  {
    id: "license-sales-scope",
    title: "License & sales scope",
    description:
      "Hosted source states its license. External sales use a creator-operated destination; the review records whether destination-domain control is verified, and unverified destinations are explicitly disclosed. Modulora does not host, fulfill, assess, or record the purchase.",
  },
  {
    id: "demo-accessibility",
    title: "Demo quality & accessibility",
    description:
      "The preview renders the submitted component and avoids obvious keyboard, focus, contrast, overflow, or misleading-state failures. A listing-quality check, not accessibility certification.",
  },
] as const;

export type ChecklistResult = "pass" | "flag" | "not-applicable";
export type Checklist = Record<string, ChecklistResult>;

export const REVIEW_DECISIONS = ["approve", "request-changes", "reject", "escalate"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

const RESULTS: readonly ChecklistResult[] = ["pass", "flag", "not-applicable"];

/**
 * Every check must carry an explicit result; unknown check ids and unknown
 * results are rejected so a stale client can't record against the wrong
 * standard. An approval with flagged checks is allowed — the rationale must
 * explain it — but every check must have been considered.
 */
export function validateChecklist(input: unknown): { ok: true; checklist: Checklist } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Checklist results are required." };
  }
  const record = input as Record<string, unknown>;
  const checklist: Checklist = {};
  for (const check of REVIEW_CHECKS) {
    const value = record[check.id];
    if (typeof value !== "string" || !RESULTS.includes(value as ChecklistResult)) {
      return { ok: false, error: `"${check.title}" needs an explicit result.` };
    }
    checklist[check.id] = value as ChecklistResult;
  }
  const unknown = Object.keys(record).filter((key) => !REVIEW_CHECKS.some((check) => check.id === key));
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown checklist entries: ${unknown.join(", ")}.` };
  }
  return { ok: true, checklist };
}
