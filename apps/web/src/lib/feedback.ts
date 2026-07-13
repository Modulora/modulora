/**
 * Feedback → Discord. One server fn; the webhook URL stays server-side.
 * Keyless dev logs instead of silently dropping. Awaited on the way out —
 * the Workers runtime cancels dangling promises.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getCurrentUser } from "./session";

export const submitFeedback = createServerFn({ method: "POST" })
  .validator((data: { message: string; page: string }) => ({
    message: String(data.message ?? "").trim().slice(0, 2000),
    page: String(data.page ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (data.message.length < 4) return { ok: false, error: "Say a little more." };
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false, error: "Sign in to send feedback." };

    const webhook = process.env.DISCORD_FEEDBACK_WEBHOOK;
    const body = {
      // Discord webhook payload; content is plain text, embeds carry context.
      content: null,
      embeds: [
        {
          title: "Feedback",
          description: data.message,
          color: 0xf5a623,
          fields: [
            { name: "From", value: `@${user.username ?? user.email}`, inline: true },
            { name: "Page", value: data.page || "unknown", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    if (!webhook) {
      console.log(`[feedback] would send to Discord: ${JSON.stringify(body)}`);
      return { ok: true };
    }
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error("feedback webhook failed", res.status, await res.text());
        return { ok: false, error: "Could not deliver feedback — try again." };
      }
      return { ok: true };
    } catch (error) {
      console.error("feedback webhook failed", error);
      return { ok: false, error: "Could not deliver feedback — try again." };
    }
  });
