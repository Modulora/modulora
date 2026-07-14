import { describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ env: {} }));

import { createReportWebhookPayload, reportRefPartIsValid, REPORT_REASONS, resolveReportContact } from "../src/lib/report";
import {
  createReporterContactToken,
  hashReporterContactToken,
  reporterContactTokenIsValid,
} from "../src/lib/report-contact";
import { consumeReportRateLimit, reportRateLimitKey } from "../src/lib/report-rate-limit";
import { showReporterContactConfirmation } from "../src/routes/api/report-contact/verify";

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

  it("rejects request-controlled report references that could inject into sinks", () => {
    expect(reportRefPartIsValid("live-counter")).toBe(true);
    expect(reportRefPartIsValid("maker\nReporter: victim@example.com")).toBe(false);
    expect(reportRefPartIsValid("../admin")).toBe(false);
    expect(reportRefPartIsValid("a".repeat(41))).toBe(false);
  });

  it("keeps reporter contact and free-form evidence out of webhook notifications", () => {
    const payload = JSON.stringify(createReportWebhookPayload("@maker/live-counter", "Something else"));
    expect(payload).toContain("@maker/live-counter");
    expect(payload).toContain("Private; confirmation pending");
    expect(payload).not.toContain("reporter@example.com");
    expect(payload).not.toContain("unpublished evidence");
    expect(payload).not.toContain("Details");
  });

  it("creates a case-specific, hashed, 24-hour contact token", async () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    const result = await createReporterContactToken(now);

    expect(reporterContactTokenIsValid(result.token)).toBe(true);
    expect(result.tokenHash).toBe(await hashReporterContactToken(result.token));
    expect(result.tokenHash).not.toBe(result.token);
    expect(result.expiresAt.toISOString()).toBe("2026-07-15T12:00:00.000Z");
    expect(reporterContactTokenIsValid("not-a-token")).toBe(false);
  });

  it("uses account identity before Cloudflare IP for report throttling", () => {
    const request = new Request("https://modulora.dev", {
      headers: { "CF-Connecting-IP": "203.0.113.8", "x-forwarded-for": "198.51.100.3" },
    });
    expect(reportRateLimitKey(request, "user_123")).toBe("user:user_123");
    expect(reportRateLimitKey(request, null)).toBe("ip:203.0.113.8");
  });

  it("falls back to the first forwarded IP outside Cloudflare", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "198.51.100.3, 198.51.100.4" },
    });
    expect(reportRateLimitKey(request, null)).toBe("ip:198.51.100.3");
  });

  it("rejects a report when the native limiter exhausts its quota", async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const allowed = await consumeReportRateLimit(
      new Request("https://modulora.dev", { headers: { "CF-Connecting-IP": "203.0.113.8" } }),
      null,
      { limit },
    );
    expect(allowed).toBe(false);
    expect(limit).toHaveBeenCalledWith({ key: "ip:203.0.113.8" });
  });

  it("fails closed when the production rate-limit binding is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(consumeReportRateLimit(new Request("https://modulora.dev"), null, undefined)).resolves.toBe(false);
    expect(error).toHaveBeenCalledWith("REPORT_RATE_LIMITER binding is missing");
    error.mockRestore();
    vi.unstubAllEnvs();
  });

  it("requires an intentional POST before confirming reporter contact", async () => {
    const { token } = await createReporterContactToken();
    const response = await showReporterContactConfirmation({
      request: new Request(`https://modulora.dev/api/report-contact/verify?token=${token}`),
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<form method="post">');
    expect(html).toContain(`name="token" value="${token}"`);
    expect(html).toContain("Confirm contact address");
  });
});
