import { describe, expect, it } from "vitest";
import { extractToolMetadata, isPrivateOrReservedIp } from "../src/lib/tool-metadata-core";
import { TOOL_REVIEW_CHECKS, validateToolReviewChecklist } from "../src/lib/tool-review-standard";

describe("tool metadata", () => {
  it("prefers Open Graph metadata and resolves a relative HTTPS image", () => {
    const result = extractToolMetadata(`<!doctype html><html><head><title>Fallback</title><meta property="og:title" content="Useful &amp; Focused"><meta property="og:description" content="A concrete workflow."><meta property="og:image" content="/card.png"></head></html>`, "https://tool.example.com/path");
    expect(result).toEqual({ title: "Useful & Focused", description: "A concrete workflow.", imageUrl: "https://tool.example.com/card.png" });
  });

  it("ignores non-HTTPS Open Graph images", () => {
    expect(extractToolMetadata('<meta property="og:image" content="http://example.com/card.png">', "https://example.com").imageUrl).toBeNull();
  });

  it("rejects private and reserved network destinations", () => {
    for (const address of ["127.0.0.1", "10.0.0.4", "172.16.0.1", "192.168.1.2", "169.254.1.1", "198.51.100.4", "203.0.113.8", "::1", "::ffff:127.0.0.1", "fe80::1", "fc00::1"]) expect(isPrivateOrReservedIp(address)).toBe(true);
    expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIp("2606:4700:4700::1111")).toBe(false);
  });
});

describe("tool usefulness review", () => {
  it("requires every versioned usefulness check", () => {
    const complete = Object.fromEntries(TOOL_REVIEW_CHECKS.map((check) => [check.id, "pass"]));
    expect(validateToolReviewChecklist(complete).ok).toBe(true);
    delete complete[TOOL_REVIEW_CHECKS[0].id];
    expect(validateToolReviewChecklist(complete).ok).toBe(false);
  });
});
