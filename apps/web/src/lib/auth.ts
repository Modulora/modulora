/**
 * Better Auth server configuration.
 *
 * Auth activates only when DATABASE_URL and BETTER_AUTH_SECRET are set; the
 * public catalog stays usable without a database. GitHub OAuth is the primary
 * sign-in method. Email/password stays enabled as a fallback.
 *
 * Uses the Neon serverless (HTTP) driver so the same config runs on the
 * Cloudflare Worker. On first sign-in we claim the user's reserved waitlist
 * username as their namespace (see claimNamespaceForUser).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";

type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Claim a namespace for a freshly created user. Prefers a reserved waitlist
 * username tied to the user's email; otherwise derives a safe handle from the
 * email/name and de-duplicates. Never throws into the auth flow.
 */
async function claimNamespaceForUser(
  db: Db,
  user: { id: string; email: string; name?: string | null },
) {
  try {
    const reserved = await db
      .select()
      .from(schema.waitlistEntries)
      .where(eq(schema.waitlistEntries.email, user.email.toLowerCase()))
      .limit(1);

    let handle = reserved[0]?.username ?? deriveHandle(user.email, user.name);
    handle = await ensureUniqueHandle(db, handle);

    await db
      .update(schema.users)
      .set({ username: handle, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    await db
      .insert(schema.namespaces)
      .values({ name: handle, ownerUserId: user.id })
      .onConflictDoNothing();

    if (reserved[0]) {
      await db
        .update(schema.waitlistEntries)
        .set({ claimedByUserId: user.id, claimedAt: new Date() })
        .where(eq(schema.waitlistEntries.id, reserved[0].id));
    }
  } catch (error) {
    console.error("namespace claim failed", error);
  }
}

function deriveHandle(email: string, name?: string | null): string {
  const base = (name ?? email.split("@")[0] ?? "user")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return base.length >= 2 ? base : `user-${base}`;
}

async function ensureUniqueHandle(db: Db, handle: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? handle : `${handle}-${attempt + 1}`;
    const [taken] = await db
      .select({ id: schema.namespaces.id })
      .from(schema.namespaces)
      .where(eq(schema.namespaces.name, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${handle}-${Date.now().toString(36)}`;
}

function buildAuth(databaseUrl: string, secret: string) {
  const db = drizzle(neon(databaseUrl), { schema });
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  // Better Auth expects singular model names (user/session/account/verification).
  // Our @modulora/db schema uses plural exports, so map them explicitly.
  const authSchema = {
    user: schema.users,
    session: schema.sessions,
    account: schema.accounts,
    verification: schema.verifications,
  };

  return betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    emailAndPassword: { enabled: true },
    socialProviders:
      githubClientId && githubClientSecret
        ? { github: { clientId: githubClientId, clientSecret: githubClientSecret } }
        : undefined,
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await claimNamespaceForUser(db, user);
          },
        },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
  });
}

let cached: ReturnType<typeof buildAuth> | null = null;

export function getAuth() {
  const databaseUrl = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!databaseUrl || !secret) return null;
  cached ??= buildAuth(databaseUrl, secret);
  return cached;
}
