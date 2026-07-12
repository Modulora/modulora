import { createServerFn } from "@tanstack/react-start";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { count, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { RESERVED_USERNAMES, USERNAME_PATTERN } from "./username";

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,24}$/;
const RESERVED = RESERVED_USERNAMES;

export interface WaitlistResult {
  ok: boolean;
  error?: string;
  username?: string;
  memberNumber?: number;
}

async function notifyDiscord(username: string, memberNumber?: number) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: memberNumber
              ? `Waitlist member #${memberNumber}`
              : "New waitlist reservation",
            description: `**@${username}** just reserved their username.`,
            color: 0xf5f5f5,
            timestamp: new Date().toISOString(),
            footer: { text: "modulora.dev" },
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("discord notification failed", res.status);
    }
  } catch (error) {
    console.error("discord notification failed", error);
  }
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

export type UsernameCheck =
  | { state: "available" }
  | { state: "taken" }
  | { state: "invalid"; reason: string }
  | { state: "unknown" };

export const checkUsername = createServerFn({ method: "POST" })
  .validator((data: { username: string }) => ({
    username: String(data.username ?? "")
      .trim()
      .toLowerCase(),
  }))
  .handler(async ({ data }): Promise<UsernameCheck> => {
    const { username } = data;
    if (!USERNAME_PATTERN.test(username)) {
      return {
        state: "invalid",
        reason:
          "2\u201340 characters: lowercase letters, numbers, single hyphens.",
      };
    }
    if (RESERVED.has(username)) {
      return { state: "invalid", reason: "That username is reserved." };
    }
    const db = getDb();
    if (!db) return { state: "unknown" };
    try {
      const existing = await db
        .select({ id: schema.waitlistEntries.id })
        .from(schema.waitlistEntries)
        .where(eq(schema.waitlistEntries.username, username))
        .limit(1);
      return existing.length > 0 ? { state: "taken" } : { state: "available" };
    } catch (error) {
      console.error("username check failed", error);
      return { state: "unknown" };
    }
  });

export const joinWaitlist = createServerFn({ method: "POST" })
  .validator((data: { username: string; email: string }) => {
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
      let memberNumber: number | undefined;
      try {
        const [row] = await db
          .select({ total: count() })
          .from(schema.waitlistEntries);
        memberNumber = row?.total;
      } catch {
        // Member number is cosmetic; never fail the reservation over it.
      }
      // Fire-and-forget: notification failures must never block a reservation.
      await Promise.allSettled([
        sendWelcomeEmail(email, username),
        notifyDiscord(username, memberNumber),
      ]);
      return { ok: true, username, memberNumber };
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
