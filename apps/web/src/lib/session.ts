/**
 * Server-side session access for TanStack Start server functions and route
 * loaders. Returns the authenticated user (with Modulora profile fields) or
 * null. Never throws when auth is unconfigured.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { alphaGateActive, isAllowedEmail } from "./access";
import { getAuth } from "./auth";
import { hasAcceptedInvitation } from "./invitation-core";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  username: string | null;
  usernameChangedAt: string | null;
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  xUrl: string | null;
  sponsorUrl: string | null;
  githubUsername: string | null;
  xUsername: string | null;
  stripeAccountId: string | null;
  payoutsEnabled: boolean;
  isCurator: boolean;
  isPlus: boolean;
  colorVisionMode: import("./pierre-theme").ColorVisionMode;
}

export async function getCurrentUser(request: Request): Promise<CurrentUser | null> {
  const auth = getAuth();
  const databaseUrl = process.env.DATABASE_URL;
  if (!auth || !databaseUrl) return null;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const db = drizzle(neon(databaseUrl), { schema });
  // Alpha gate: allow either the legacy operations allowlist or a redeemed,
  // non-revoked invitation. Fail closed if invitation lookup fails.
  if (alphaGateActive() && session.user.email && !isAllowedEmail(session.user.email)) {
    try {
      if (!(await hasAcceptedInvitation(db, session.user.id))) return null;
    } catch (error) {
      console.error("alpha invitation access check failed", error);
      return null;
    }
  }

  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    username: row.username,
    usernameChangedAt: row.usernameChangedAt?.toISOString() ?? null,
    bio: row.bio,
    websiteUrl: row.websiteUrl,
    githubUrl: row.githubUrl,
    xUrl: row.xUrl,
    sponsorUrl: row.sponsorUrl,
    githubUsername: row.githubUsername,
    xUsername: row.xUsername,
    stripeAccountId: row.stripeAccountId,
    payoutsEnabled: row.payoutsEnabled,
    isCurator: row.isCurator,
    isPlus: row.isPlus,
    colorVisionMode: (row.colorVisionMode ?? "standard") as import("./pierre-theme").ColorVisionMode,
  };
}

/**
 * Server function for route loaders / the app shell. Reads the request from
 * TanStack Start's server context and returns the current user or null.
 */
export const fetchCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUser | null> => {
    const request = getRequest();
    if (!request) return null;
    return getCurrentUser(request);
  },
);

/** Root context: the user plus whether the alpha gate is active. */
export const fetchSessionContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ user: CurrentUser | null; gated: boolean }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    return { user, gated: alphaGateActive() };
  },
);
