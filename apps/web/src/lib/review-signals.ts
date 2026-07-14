/**
 * Per-check evidence signals for the alpha-1 review standard. Presentational-
 * safe and pure: derives machine signals from a release's evidence records so
 * curators don't re-derive what automation already proved. Signals PREFILL
 * checklist results — the curator owns every result and the decision, and
 * automation never approves.
 */
import type { Checklist, ChecklistResult } from "./review-standard";

export interface EvidenceLike {
  type: string;
  status: string;
}

export interface CheckSignal {
  result: Extract<ChecklistResult, "pass" | "flag">;
  /** Short, scoped explanation shown beside the check. */
  reason: string;
}

/** checkId → machine signal, only where evidence actually supports one. */
export function signalsFromEvidence(evidence: EvidenceLike[]): Record<string, CheckSignal> {
  const byType = new Map(evidence.map((record) => [record.type, record.status]));
  const signals: Record<string, CheckSignal> = {};

  if (byType.get("publisher-identity") === "passed") {
    signals["publisher-association"] = { result: "pass", reason: "Publisher identity authenticated at publish." };
  }

  const similarity = byType.get("similarity-screen");
  if (similarity === "passed") {
    signals["authorization-attribution"] = { result: "pass", reason: "No corpus similarity detected (corpus-limited)." };
  } else if (similarity === "warning") {
    signals["authorization-attribution"] = { result: "flag", reason: "Similarity candidates detected — inspect the comparison." };
  }

  if (byType.get("content-integrity") === "passed") {
    signals["artifact-integrity"] = { result: "pass", reason: "Digest and exact install files recorded at publish." };
  }

  const parity = byType.get("install-parity");
  if (parity === "passed") {
    signals["install-behavior"] = { result: "pass", reason: "Install parity verified; installs copy files only." };
  } else if (parity === "warning") {
    signals["install-behavior"] = { result: "flag", reason: "Creator-run install command is unverifiable." };
  }

  const secret = byType.get("secret-scan");
  if (secret === "passed") {
    signals["risk-indicators"] = { result: "pass", reason: "Secret scan clean (pattern-based, not a guarantee)." };
  } else if (secret === "failed") {
    signals["risk-indicators"] = { result: "flag", reason: "Secret scan reported findings." };
  }

  if (byType.get("domain-verified") === "passed") {
    signals["license-sales-scope"] = { result: "pass", reason: "External destination domain control proven at submission." };
  } else if (byType.get("source-not-assessed") === "asserted") {
    signals["license-sales-scope"] = { result: "flag", reason: "External source not assessed — disclosure required." };
  }

  // listing-accuracy and demo-accessibility stay human by design.
  return signals;
}

/** Prefill: signal-backed results applied over the current checklist. */
export function applySignals(current: Checklist, signals: Record<string, CheckSignal>): Checklist {
  const next = { ...current };
  for (const [checkId, signal] of Object.entries(signals)) next[checkId] = signal.result;
  return next;
}
