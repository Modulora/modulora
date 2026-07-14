import { describe, expect, it } from "vitest";
import { applySignals, signalsFromEvidence } from "../src/lib/review-signals";
import { REVIEW_CHECKS } from "../src/lib/review-standard";

describe("review signals", () => {
  it("maps evidence records to per-check signals", () => {
    const signals = signalsFromEvidence([
      { type: "publisher-identity", status: "passed" },
      { type: "content-integrity", status: "passed" },
      { type: "secret-scan", status: "passed" },
      { type: "install-parity", status: "warning" },
      { type: "similarity-screen", status: "warning" },
      { type: "source-not-assessed", status: "asserted" },
    ]);
    expect(signals["publisher-association"]?.result).toBe("pass");
    expect(signals["artifact-integrity"]?.result).toBe("pass");
    expect(signals["risk-indicators"]?.result).toBe("pass");
    expect(signals["install-behavior"]?.result).toBe("flag");
    expect(signals["authorization-attribution"]?.result).toBe("flag");
    expect(signals["license-sales-scope"]?.result).toBe("flag");
  });

  it("never signals the human-only checks", () => {
    const signals = signalsFromEvidence([
      { type: "publisher-identity", status: "passed" },
      { type: "content-integrity", status: "passed" },
      { type: "secret-scan", status: "passed" },
      { type: "similarity-screen", status: "passed" },
      { type: "install-parity", status: "passed" },
      { type: "domain-verified", status: "passed" },
    ]);
    expect(signals["listing-accuracy"]).toBeUndefined();
    expect(signals["demo-accessibility"]).toBeUndefined();
    // Signals can never complete the checklist on their own — a human must
    // still answer the judgment checks, so automation cannot enable approval.
    expect(Object.keys(signals).length).toBeLessThan(REVIEW_CHECKS.length);
  });

  it("returns no signals without evidence", () => {
    expect(signalsFromEvidence([])).toEqual({});
  });

  it("prefills hosted copy-only install behavior from integrity evidence", () => {
    const signals = signalsFromEvidence([{ type: "content-integrity", status: "passed" }]);
    expect(signals["install-behavior"]).toEqual({
      result: "pass",
      reason: "Hosted install files and digest recorded; Modulora installs copy files without running scripts.",
    });
  });

  it("prefills signal-backed results without touching other checks", () => {
    const signals = signalsFromEvidence([{ type: "content-integrity", status: "passed" }]);
    const next = applySignals({ "listing-accuracy": "flag" }, signals);
    expect(next["artifact-integrity"]).toBe("pass");
    expect(next["listing-accuracy"]).toBe("flag");
  });
});
