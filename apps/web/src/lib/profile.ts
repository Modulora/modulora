/**
 * Profile mutations for the settings page. All writes are scoped to the
 * signed-in user; username changes revalidate format/uniqueness and rename the
 * owned namespace in the same transaction.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, ne } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { validateUsername } from "./username";
import { isColorVisionMode } from "./pierre-theme";

export const USERNAME_CHANGE_COOLDOWN_DAYS = 15;
const COOLDOWN_MS = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/** Next time the caller may change their username, or null if allowed now. */
export function usernameChangeAvailableAt(changedAt: string | null): string | null {
  if (!changedAt) return null;
  const next = new Date(changedAt).getTime() + COOLDOWN_MS;
  return next > Date.now() ? new Date(next).toISOString() : null;
}

export interface ProfileInput {
  name: string;
  username: string;
  imageUrl: string;
  bio: string;
  websiteUrl: string;
  githubUrl: string;
  xUrl: string;
  colorVisionMode?: string;
}

export interface ProfileResult {
  ok: boolean;
  error?: string;
  field?: keyof ProfileInput;
}

export type HandleStatus =
  | { state: "available" }
  | { state: "current" }
  | { state: "taken" }
  | { state: "invalid"; reason: string }
  | { state: "unknown" };

export const checkHandle = createServerFn({ method: "POST" })
  .validator((data: { username: string }) => ({
    username: String(data.username ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }): Promise<HandleStatus> => {
    const request = getRequest();
    if (!request) return { state: "unknown" };
    const user = await getCurrentUser(request);
    if (!user) return { state: "unknown" };

    const check = validateUsername(data.username);
    if (!check.ok) return { state: "invalid", reason: check.reason };
    if (data.username === user.username) return { state: "current" };

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return { state: "unknown" };
    const db = drizzle(neon(databaseUrl), { schema });
    const [taken] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(eq(schema.users.username, data.username), ne(schema.users.id, user.id)),
      )
      .limit(1);
    return taken ? { state: "taken" } : { state: "available" };
  });

export interface Connections {
  github: boolean;
  twitter: boolean;
  hasPassword: boolean;
}

export const getConnections = createServerFn({ method: "GET" }).handler(
  async (): Promise<Connections> => {
    const request = getRequest();
    const empty = { github: false, twitter: false, hasPassword: false };
    if (!request) return empty;
    const user = await getCurrentUser(request);
    const databaseUrl = process.env.DATABASE_URL;
    if (!user || !databaseUrl) return empty;

    const db = drizzle(neon(databaseUrl), { schema });
    const rows = await db
      .select({ providerId: schema.accounts.providerId, password: schema.accounts.password })
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, user.id));
    return {
      github: rows.some((row) => row.providerId === "github"),
      twitter: rows.some((row) => row.providerId === "twitter"),
      hasPassword: rows.some((row) => row.password != null),
    };
  },
);

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/**
 * Accepts `@handle`, a bare handle, or a profile URL on any of the given
 * hosts and returns the canonical `https://<host>/<handle>` — or null when
 * empty, or undefined when the input can't be read as a handle or profile.
 */
function normalizeHandleUrl(value: string, hosts: string[]): string | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const handlePattern = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,38}$/;
  const bare = trimmed.replace(/^@/, "");
  if (handlePattern.test(bare)) return `https://${hosts[0]}/${bare}`;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const segment = url.pathname.split("/").filter(Boolean)[0] ?? "";
    const handle = segment.replace(/^@/, "");
    if (hosts.includes(host) && handlePattern.test(handle)) {
      return `https://${hosts[0]}/${handle}`;
    }
  } catch {
    // fall through
  }
  return undefined;
}

export const updateProfile = createServerFn({ method: "POST" })
  .validator((data: ProfileInput) => ({
    name: String(data.name ?? "").trim().slice(0, 64),
    username: String(data.username ?? "").trim().toLowerCase(),
    imageUrl: String(data.imageUrl ?? "").trim(),
    bio: String(data.bio ?? "").trim().slice(0, 280),
    websiteUrl: String(data.websiteUrl ?? "").trim(),
    githubUrl: String(data.githubUrl ?? "").trim(),
    xUrl: String(data.xUrl ?? "").trim(),
    colorVisionMode: String(data.colorVisionMode ?? "").trim(),
  }))
  .handler(async ({ data }): Promise<ProfileResult> => {
    const request = getRequest();
    if (!request) return { ok: false, error: "No request context." };
    const user = await getCurrentUser(request);
    if (!user) return { ok: false, error: "You must be signed in." };

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return { ok: false, error: "Database is not configured." };

    const check = validateUsername(data.username);
    if (!check.ok) return { ok: false, error: check.reason, field: "username" };
    if (!data.name) {
      return { ok: false, error: "Display name can't be empty.", field: "name" };
    }

    const xUrl = normalizeHandleUrl(data.xUrl, ["x.com", "twitter.com"]);
    if (xUrl === undefined) {
      return { ok: false, error: "Enter an X handle (@name) or profile URL.", field: "xUrl" };
    }
    const githubUrl = normalizeHandleUrl(data.githubUrl, ["github.com"]);
    if (githubUrl === undefined) {
      return { ok: false, error: "Enter a GitHub username or profile URL.", field: "githubUrl" };
    }

    const db = drizzle(neon(databaseUrl), { schema });

    // Username uniqueness + 15-day change cooldown (ignoring the caller's own row).
    if (data.username !== user.username) {
      const blockedUntil = usernameChangeAvailableAt(user.usernameChangedAt);
      if (blockedUntil) {
        return {
          ok: false,
          field: "username",
          error: `You can change your username again on ${new Date(blockedUntil).toLocaleDateString("en-US", { dateStyle: "medium" })}.`,
        };
      }
      const [taken] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.username, data.username),
            ne(schema.users.id, user.id),
          ),
        )
        .limit(1);
      if (taken) {
        return { ok: false, error: "That username is taken.", field: "username" };
      }
    }

    await db
      .update(schema.users)
      .set({
        name: data.name,
        username: data.username,
        usernameChangedAt:
          data.username !== user.username ? new Date() : undefined,
        image: normalizeUrl(data.imageUrl),
        bio: data.bio || null,
        websiteUrl: normalizeUrl(data.websiteUrl),
        githubUrl,
        xUrl,
        colorVisionMode: isColorVisionMode(data.colorVisionMode) ? data.colorVisionMode : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    if (user.username && data.username !== user.username) {
      // Awaited: dangling promises are cancelled in the Workers runtime.
      const { emailUsernameChanged } = await import("./email");
      await emailUsernameChanged(user.email, user.username, data.username);
    }

    // Keep the owned namespace aligned with the username.
    if (user.username && data.username !== user.username) {
      await db
        .update(schema.namespaces)
        .set({ name: data.username })
        .where(eq(schema.namespaces.ownerUserId, user.id));
    } else if (!user.username) {
      await db
        .insert(schema.namespaces)
        .values({ name: data.username, ownerUserId: user.id })
        .onConflictDoNothing();
    }

    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .validator((data: { confirmUsername: string }) => ({
    confirmUsername: String(data.confirmUsername ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }): Promise<ProfileResult> => {
    const request = getRequest();
    if (!request) return { ok: false, error: "No request context." };
    const user = await getCurrentUser(request);
    if (!user) return { ok: false, error: "You must be signed in." };

    const identifier = user.username ?? user.email;
    if (data.confirmUsername !== identifier.toLowerCase()) {
      return { ok: false, error: "That does not match your username." };
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return { ok: false, error: "Database is not configured." };

    // Cascades remove sessions, accounts, namespaces, and owned components.
    const db = drizzle(neon(databaseUrl), { schema });
    await db.delete(schema.users).where(eq(schema.users.id, user.id));
    return { ok: true };
  });

/** Post-password-change notification (called after a successful change). */
export const notifyPasswordChanged = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false };
    const { emailPasswordChanged } = await import("./email");
    await emailPasswordChanged(user.email);
    return { ok: true };
  },
);
