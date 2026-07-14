import { describe, expect, it } from "vitest";
import { normalizeDomain } from "../src/lib/domains";
import { externalDomainAllowed, externalDomainDisclosure } from "../src/lib/external-sales";

describe("external sales domain policy", () => {
  it("allows unverified destinations only when verification is optional", () => {
    expect(externalDomainAllowed(false, false)).toBe(true);
    expect(externalDomainAllowed(false, true)).toBe(false);
    expect(externalDomainAllowed(true, true)).toBe(true);
  });

  it("normalizes purchase destinations consistently", () => {
    expect(normalizeDomain("https://www.example.com/buy")).toBe("example.com");
    expect(normalizeDomain("https://")).toBeNull();
  });

  it("scopes disclosure to recorded evidence", () => {
    expect(externalDomainDisclosure("2026-07-13T20:00:00.000Z")).toContain("2026-07-13");
    expect(externalDomainDisclosure(null)).toContain("has not been verified");
  });
});
