/**
 * Alpha access gate (#29). When ALPHA_ALLOWLIST is set (comma-separated
 * emails), only those accounts resolve a session — everyone else is treated
 * as signed out across every platform surface (dashboard, publishing,
 * buying, review, and CLI bearer tokens), because getCurrentUser is the
 * single choke point. Unset (local dev) means no gate.
 */
export function alphaAllowlist(): string[] | null {
  const raw = process.env.ALPHA_ALLOWLIST?.trim();
  if (!raw) return null;
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string): boolean {
  const list = alphaAllowlist();
  if (!list) return true;
  return list.includes(email.trim().toLowerCase());
}

export function alphaGateActive(): boolean {
  return alphaAllowlist() !== null;
}
