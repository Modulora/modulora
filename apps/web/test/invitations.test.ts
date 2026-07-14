import { describe, expect, it } from "vitest";
import {
  ALPHA_INVITATION_COOKIE,
  clearInvitationCookie,
  classifyInvitation,
  generateInvitationToken,
  hashInvitationToken,
  invitationCookie,
  invitationTokenFromRequest,
  normalizeInvitationEmail,
  userCreationRequiresInvitation,
} from "../src/lib/invitation-core";

describe("alpha invitation security", () => {
  it("generates high-entropy opaque tokens and stores only deterministic digests", async () => {
    const first = generateInvitationToken();
    const second = generateInvitationToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(await hashInvitationToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashInvitationToken(first)).toBe(await hashInvitationToken(first));
    expect(await hashInvitationToken(first)).not.toBe(first);
  });

  it("classifies terminal states before expiration", () => {
    const future = new Date("2030-01-01T00:00:00Z");
    const past = new Date("2020-01-01T00:00:00Z");
    const now = new Date("2026-01-01T00:00:00Z");
    expect(classifyInvitation({ acceptedAt: null, revokedAt: null, expiresAt: future }, now)).toBe("pending");
    expect(classifyInvitation({ acceptedAt: now, revokedAt: null, expiresAt: past }, now)).toBe("accepted");
    expect(classifyInvitation({ acceptedAt: null, revokedAt: now, expiresAt: future }, now)).toBe("revoked");
    expect(classifyInvitation({ acceptedAt: now, revokedAt: now, expiresAt: future }, now)).toBe("revoked");
    expect(classifyInvitation({ acceptedAt: null, revokedAt: null, expiresAt: past }, now)).toBe("expired");
  });

  it("requires invitations only for gated, non-allowlisted account creation", () => {
    expect(userCreationRequiresInvitation(false, false)).toBe(false);
    expect(userCreationRequiresInvitation(true, true)).toBe(false);
    expect(userCreationRequiresInvitation(true, false)).toBe(true);
  });

  it("round-trips the HttpOnly setup cookie without exposing it to other names", () => {
    const expires = new Date(Date.now() + 60_000);
    const header = invitationCookie("secret-token", expires, true);
    expect(header).toContain(`${ALPHA_INVITATION_COOKIE}=secret-token`);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
    const request = new Request("https://modulora.dev/api/auth/sign-up/email", {
      headers: { cookie: `other=1; ${ALPHA_INVITATION_COOKIE}=secret-token` },
    });
    expect(invitationTokenFromRequest(request)).toBe("secret-token");
    expect(clearInvitationCookie(true)).toContain("Max-Age=0");
  });

  it("normalizes invitation identity emails", () => {
    expect(normalizeInvitationEmail(" Creator@Example.COM ")).toBe("creator@example.com");
  });
});
