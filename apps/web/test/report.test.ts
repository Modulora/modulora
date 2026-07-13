import { describe, expect, it } from "vitest";

import { REPORT_REASONS, resolveReportContact } from "../src/lib/report";

describe("component reports", () => {
  it("accepts a contact email without an account", () => {
    expect(resolveReportContact(null, " Creator@Example.com ")).toBe("creator@example.com");
  });

  it("uses the signed-in account email when available", () => {
    expect(resolveReportContact("member@example.com", "not-an-email")).toBe("member@example.com");
  });

  it("rejects an invalid anonymous contact", () => {
    expect(resolveReportContact(null, "not-an-email")).toBeNull();
  });

  it("offers creator-association report reasons without asserting guilt", () => {
    expect(REPORT_REASONS).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "stolen", label: expect.stringContaining("Suspected") }),
      expect.objectContaining({ id: "impersonation" }),
      expect.objectContaining({ id: "association" }),
    ]));
  });
});
