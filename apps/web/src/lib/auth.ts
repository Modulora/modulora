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
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";
import { deviceAuthorization } from "better-auth/plugins/device-authorization";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { alphaGateActive, isAllowedEmail } from "./access";
import {
  activeInvitationFor,
  clearInvitationCookie,
  consumeInvitation,
  invitationAcceptedBy,
  invitationTokenFromRequest,
  userCreationRequiresInvitation,
} from "./invitation-core";

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

/**
 * When a GitHub account is linked, resolve the verified GitHub login via the
 * API and store it as a proven identity. A hand-typed github_url that differs
 * is then shown as unverified. Never throws into the auth flow.
 */
async function captureGithubIdentity(
  db: Db,
  account: { userId: string; providerId: string; accessToken?: string | null },
) {
  if (account.providerId !== "github" || !account.accessToken) return;
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        authorization: `Bearer ${account.accessToken}`,
        accept: "application/vnd.github+json",
        "user-agent": "modulora",
      },
    });
    if (!res.ok) return;
    const profile = (await res.json()) as { login?: string; html_url?: string };
    if (!profile.login) return;

    const [current] = await db
      .select({ githubUrl: schema.users.githubUrl })
      .from(schema.users)
      .where(eq(schema.users.id, account.userId))
      .limit(1);

    await db
      .update(schema.users)
      .set({
        githubUsername: profile.login,
        // Adopt the verified URL only if the user hasn't set one themselves.
        githubUrl: current?.githubUrl || profile.html_url || `https://github.com/${profile.login}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, account.userId));
  } catch (error) {
    console.error("github identity capture failed", error);
  }
}

/**
 * When an X (Twitter) account is linked, resolve the verified @handle via the
 * v2 API and store it as a proven identity. Never throws into the auth flow.
 */
async function captureXIdentity(
  db: Db,
  account: { userId: string; providerId: string; accessToken?: string | null },
) {
  if (account.providerId !== "twitter" || !account.accessToken) return;
  try {
    const res = await fetch("https://api.twitter.com/2/users/me", {
      headers: { authorization: `Bearer ${account.accessToken}` },
    });
    if (!res.ok) return;
    const profile = (await res.json()) as { data?: { username?: string } };
    const username = profile.data?.username;
    if (!username) return;

    const [current] = await db
      .select({ xUrl: schema.users.xUrl })
      .from(schema.users)
      .where(eq(schema.users.id, account.userId))
      .limit(1);

    await db
      .update(schema.users)
      .set({
        xUsername: username,
        xUrl: current?.xUrl || `https://x.com/${username}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, account.userId));
  } catch (error) {
    console.error("x identity capture failed", error);
  }
}

function buildAuth(databaseUrl: string, secret: string) {
  const db = drizzle(neon(databaseUrl), { schema });
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const xClientId = process.env.TWITTER_CLIENT_ID;
  const xClientSecret = process.env.TWITTER_CLIENT_SECRET;

  // Better Auth expects singular model names (user/session/account/verification).
  // Our @modulora/db schema uses plural exports, so map them explicitly.
  const authSchema = {
    user: schema.users,
    session: schema.sessions,
    account: schema.accounts,
    verification: schema.verifications,
    deviceCode: schema.deviceCodes,
  };

  return betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
      "https://modulora.dev",
      "https://www.modulora.dev",
      "http://localhost:5173",
      process.env.BETTER_AUTH_URL,
    ].filter((origin): origin is string => Boolean(origin)),
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const { emailPasswordReset } = await import("./email");
        await emailPasswordReset(user.email, url);
      },
      onPasswordReset: async ({ user }, request) => {
        const token = invitationTokenFromRequest(request);
        if (token) {
          const consumed = await consumeInvitation(db, user.email, user.id, token);
          const accepted = consumed || await invitationAcceptedBy(db, user.id, token);
          if (!accepted) {
            throw new APIError("CONFLICT", {
              message: "Your password was updated, but alpha access could not claim the reserved username. Contact Modulora support.",
            });
          }
        }
      },
    },
    socialProviders: {
      ...(githubClientId && githubClientSecret
        ? { github: { clientId: githubClientId, clientSecret: githubClientSecret } }
        : {}),
      ...(xClientId && xClientSecret
        ? { twitter: { clientId: xClientId, clientSecret: xClientSecret } }
        : {}),
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["github"],
        allowDifferentEmails: false,
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const session = ctx.context.newSession;
        const token = invitationTokenFromRequest(ctx.request);
        if (session?.user && token) {
          const consumed = await consumeInvitation(db, session.user.email, session.user.id, token);
          const accepted = consumed || await invitationAcceptedBy(db, session.user.id, token);
          if (accepted) {
            const secure = ctx.request ? new URL(ctx.request.url).protocol === "https:" : process.env.NODE_ENV === "production";
            const cookie = clearInvitationCookie(secure);
            if (ctx.context.responseHeaders) ctx.context.responseHeaders.append("set-cookie", cookie);
            else ctx.context.responseHeaders = new Headers({ "set-cookie": cookie });
          }
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            if (!userCreationRequiresInvitation(alphaGateActive(), isAllowedEmail(user.email))) return { data: user };
            const token = invitationTokenFromRequest(ctx?.request);
            if (!token || !(await activeInvitationFor(db, user.email, token))) {
              throw new APIError("FORBIDDEN", {
                message: "A valid alpha invitation is required to create an account.",
              });
            }
            return { data: { ...user, email: user.email.toLowerCase() } };
          },
          after: async (user, ctx) => {
            const token = invitationTokenFromRequest(ctx?.request);
            // Wait until Better Auth has created the credential/social account
            // before consuming the invitation. The account hook below cleans
            // up failed redemptions instead of stranding the email.
            if (token) return;
            await claimNamespaceForUser(db, user);
          },
        },
      },
      account: {
        create: {
          after: async (account, ctx) => {
            const token = invitationTokenFromRequest(ctx?.request);
            if (token) {
              const [user] = await db
                .select({ id: schema.users.id, email: schema.users.email })
                .from(schema.users)
                .where(eq(schema.users.id, account.userId))
                .limit(1);
              if (user) {
                const consumed = await consumeInvitation(db, user.email, user.id, token);
                const accepted = consumed || await invitationAcceptedBy(db, user.id, token);
                if (!accepted) {
                  await db.delete(schema.accounts).where(eq(schema.accounts.id, account.id));
                  const [otherAccount] = await db
                    .select({ id: schema.accounts.id })
                    .from(schema.accounts)
                    .where(eq(schema.accounts.userId, user.id))
                    .limit(1);
                  if (!otherAccount && !isAllowedEmail(user.email)) {
                    await db.delete(schema.users).where(eq(schema.users.id, user.id));
                  }
                  throw new APIError("CONFLICT", {
                    message: "The invitation could not claim its reserved username. No account was created.",
                  });
                }
              }
            }
            await captureGithubIdentity(db, account);
            await captureXIdentity(db, account);
          },
        },
      },
    },
    plugins: [
      // CLI login: RFC 8628 device flow. The CLI requests a code, the user
      // approves at /device, the CLI polls for a bearer session token.
      deviceAuthorization({
        expiresIn: "10m",
        interval: "3s",
        validateClient: (clientId) => clientId === "modulora-cli",
        // Send users to our approval page, not the raw API path.
        verificationUri: `${(process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "")}/device`,
      }),
      // Lets Authorization: Bearer <session token> authenticate API requests.
      bearer(),
    ],
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
