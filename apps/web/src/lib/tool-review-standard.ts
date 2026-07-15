export const TOOL_REVIEW_STANDARD_VERSION = "tool-alpha-2";

export const TOOL_REVIEW_LIMITATIONS =
  "Approval means the tool/site was useful and relevant enough for Modulora's catalog at review time. It is not a security, privacy, legal, accessibility, ownership, or ongoing availability certification.";

export const TOOL_REVIEW_CHECKS = [
  { id: "domain-ownership", title: "Owner-authorized domain", description: "The submitted URL remains on a domain verified by this creator in Modulora." },
  { id: "working-experience", title: "Working experience", description: "The live preview or direct site loads and presents a functioning tool, resource, or service." },
  { id: "useful-outcome", title: "Useful outcome", description: "A visitor can identify a concrete task, workflow, reference, or outcome the listing helps them accomplish." },
  { id: "catalog-relevance", title: "Catalog relevance", description: "The listing is meaningfully relevant to UI creation, development, design systems, component work, or adjacent creator workflows." },
  { id: "accurate-presentation", title: "Accurate presentation", description: "The submitted title, description, category, pricing label, and creator-uploaded site thumbnails fairly represent the live site." },
  { id: "obvious-harm", title: "No obvious deception or harm", description: "A reasonable inspection found no obvious impersonation, malware prompt, credential harvesting, or materially deceptive behavior." },
] as const;

export type ToolReviewDecision = "approve" | "request-changes" | "reject" | "escalate";
export type ToolReviewChecklist = Record<(typeof TOOL_REVIEW_CHECKS)[number]["id"], "pass" | "flag" | "not-applicable">;

export function validateToolReviewChecklist(input: unknown): { ok: true; checklist: ToolReviewChecklist } | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Complete every usefulness review check." };
  const record = input as Record<string, unknown>;
  const checklist = {} as ToolReviewChecklist;
  for (const check of TOOL_REVIEW_CHECKS) {
    const value = record[check.id];
    if (value !== "pass" && value !== "flag" && value !== "not-applicable") return { ok: false, error: `Complete “${check.title}” before deciding.` };
    checklist[check.id] = value;
  }
  return { ok: true, checklist };
}
