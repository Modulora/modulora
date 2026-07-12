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

/**
 * Platform owner(s) — OWNER_USER_IDS env, comma-separated user ids. Gates
 * money operations (profit-share distribution runs). Deliberately stricter
 * and separate from is_curator: curators review content, owners move money.
 *
 * Gated by user ID, not email: emails are assertions (registerable,
 * case-collidable, changeable, asserted by OAuth providers), while ids are
 * opaque, immutable, and assigned by our own database. Unset means the
 * admin surface doesn't exist.
 */
export function isOwnerUser(userId: string | null | undefined): boolean {
  const raw = process.env.OWNER_USER_IDS?.trim();
  if (!raw || !userId) return false;
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .includes(userId);
}
