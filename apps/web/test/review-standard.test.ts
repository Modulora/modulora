import { describe, expect, it } from "vitest";
import {
  REVIEW_CHECKS,
  REVIEW_DECISIONS,
  REVIEW_STANDARD_LIMITATIONS,
  REVIEW_STANDARD_VERSION,
  validateChecklist,
} from "../src/lib/review-standard";

function completeChecklist(result: "pass" | "flag" | "not-applicable" = "pass") {
  return Object.fromEntries(REVIEW_CHECKS.map((check) => [check.id, result]));
}

describe("review standard", () => {
  it("is versioned and states its scope limitation", () => {
    expect(REVIEW_STANDARD_VERSION).toBe("alpha-1");
    expect(REVIEW_STANDARD_LIMITATIONS).toMatch(/listing decision/i);
    expect(REVIEW_STANDARD_LIMITATIONS).toMatch(/not a security audit/i);
  });

  it("defines the eight alpha-1 checks with visible descriptions", () => {
    expect(REVIEW_CHECKS).toHaveLength(8);
    for (const check of REVIEW_CHECKS) {
      expect(check.id).toMatch(/^[a-z][a-z-]+$/);
      expect(check.title.length).toBeGreaterThan(3);
      expect(check.description.length).toBeGreaterThan(20);
    }
    expect(REVIEW_DECISIONS).toEqual(["approve", "request-changes", "reject", "escalate"]);
  });

  it("accepts a complete checklist", () => {
    const result = validateChecklist(completeChecklist());
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.checklist)).toHaveLength(REVIEW_CHECKS.length);
  });

  it("accepts flagged and not-applicable results", () => {
    expect(validateChecklist(completeChecklist("flag")).ok).toBe(true);
    expect(validateChecklist(completeChecklist("not-applicable")).ok).toBe(true);
  });

  it("rejects a missing check", () => {
    const checklist = completeChecklist();
    delete checklist[REVIEW_CHECKS[0]!.id];
    const result = validateChecklist(checklist);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(REVIEW_CHECKS[0]!.title);
  });

  it("rejects unknown results and unknown check ids", () => {
    expect(validateChecklist({ ...completeChecklist(), [REVIEW_CHECKS[0]!.id]: "maybe" }).ok).toBe(false);
    expect(validateChecklist({ ...completeChecklist(), invented: "pass" }).ok).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(validateChecklist(null).ok).toBe(false);
    expect(validateChecklist([]).ok).toBe(false);
    expect(validateChecklist("pass").ok).toBe(false);
    expect(validateChecklist(undefined).ok).toBe(false);
  });
});
