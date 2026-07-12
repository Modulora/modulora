/** Shared username rules for waitlist reservation and profile edits. */

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "cli",
  "cloud",
  "components",
  "dashboard",
  "docs",
  "help",
  "modulora",
  "official",
  "registry",
  "root",
  "security",
  "settings",
  "shadcn",
  "spec",
  "support",
  "system",
  "team",
  "waitlist",
  "www",
]);

export type UsernameCheck =
  | { ok: true }
  | { ok: false; reason: string };

export function validateUsername(raw: string): UsernameCheck {
  const username = raw.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      reason: "2\u201340 characters: lowercase letters, numbers, single hyphens.",
    };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, reason: "That username is reserved." };
  }
  return { ok: true };
}
