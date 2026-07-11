/**
 * Better Auth server configuration.
 *
 * Auth activates only when DATABASE_URL and BETTER_AUTH_SECRET are set;
 * the vertical slice deliberately keeps the public catalog usable without
 * a database. Passkey/MFA plugins land with the publishing milestone,
 * where they become mandatory for publishers (see docs/security.md).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { schema } from "@modulora/db";

function buildAuth(databaseUrl: string, secret: string) {
  const db = drizzle(databaseUrl, { schema });
  return betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: { enabled: true },
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
