import { createServerFn } from "@tanstack/react-start";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { schema } from "@modulora/db";

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,24}$/;
const RESERVED = new Set([
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

export interface WaitlistResult {
  ok: boolean;
  error?: string;
  username?: string;
}

async function sendWelcomeEmail(email: string, username: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.RESEND_FROM ?? "Modulora <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        template: {
          id: "welcome-to-modulora",
          variables: { reservedusername: username },
        },
      }),
    });
    if (!res.ok) {
      console.error("welcome email failed", res.status, await res.text());
    }
  } catch (error) {
    console.error("welcome email failed", error);
  }
}

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return drizzle(neon(url), { schema });
}

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; email: string }) => {
    const username = String(data.username ?? "")
      .trim()
      .toLowerCase();
    const email = String(data.email ?? "")
      .trim()
      .toLowerCase();
    return { username, email };
  })
  .handler(async ({ data }): Promise<WaitlistResult> => {
    const { username, email } = data;

    if (!USERNAME_PATTERN.test(username)) {
      return {
        ok: false,
        error:
          "Usernames are 2–40 characters: lowercase letters, numbers, and single hyphens.",
      };
    }
    if (RESERVED.has(username)) {
      return { ok: false, error: "That username is reserved." };
    }
    if (!EMAIL_PATTERN.test(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }

    const db = getDb();
    if (!db) {
      return { ok: false, error: "The waitlist is temporarily unavailable." };
    }

    try {
      await db
        .insert(schema.waitlistEntries)
        .values({ username, email });
      // Fire-and-forget: email failures must never block a reservation.
      await sendWelcomeEmail(email, username);
      return { ok: true, username };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("waitlist_entries_username_unique")) {
        return { ok: false, error: "That username is already reserved." };
      }
      if (message.includes("waitlist_entries_email_unique")) {
        return { ok: false, error: "That email is already on the waitlist." };
      }
      console.error("waitlist insert failed", error);
      return { ok: false, error: "Something went wrong. Try again shortly." };
    }
  });
