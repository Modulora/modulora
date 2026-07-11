import { describe, expect, it } from "vitest";
import { catalog, findItem } from "../src/data/catalog";

describe("catalog seed", () => {
  it("contains creator-authorized items", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(2);
    for (const item of catalog) {
      expect(item.schemaVersion).toBe("0");
      expect(item.namespace).toMatch(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/);
      expect(item.version).toMatch(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/);
      expect(item.evidence.length).toBeGreaterThan(0);
    }
  });

  it("requires purchase metadata for external-commercial items", () => {
    for (const item of catalog.filter((c) => c.sourceModel === "external-commercial")) {
      expect(item.purchase?.domain).toBeTruthy();
      expect(item.evidence.some((e) => e.type === "source-not-assessed")).toBe(true);
    }
  });

  it("requires source and SPDX license for open-source items", () => {
    for (const item of catalog.filter((c) => c.sourceModel === "open-source")) {
      expect(item.source?.commit).toMatch(/^[a-f0-9]{40}$/);
      expect(item.license.kind).toBe("spdx");
    }
  });

  it("resolves items by namespace and name", () => {
    expect(findItem("northstar", "calendar")?.title).toBe("Calendar");
    expect(findItem("northstar", "missing")).toBeUndefined();
  });
});
