/**
 * Server-side session access for TanStack Start server functions and route
 * loaders. Returns the authenticated user (with Modulora profile fields) or
 * null. Never throws when auth is unconfigured.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getAuth } from "./auth";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  username: string | null;
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  xUrl: string | null;
}

export async function getCurrentUser(request: Request): Promise<CurrentUser | null> {
  const auth = getAuth();
  const databaseUrl = process.env.DATABASE_URL;
  if (!auth || !databaseUrl) return null;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const db = drizzle(neon(databaseUrl), { schema });
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
    bio: row.bio,
    websiteUrl: row.websiteUrl,
    githubUrl: row.githubUrl,
    xUrl: row.xUrl,
  };
}
