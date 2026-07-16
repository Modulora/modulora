/**
 * Feedback → Discord. One server fn; the webhook URL stays server-side.
 * Keyless dev logs instead of silently dropping. Awaited on the way out —
 * the Workers runtime cancels dangling promises.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getCurrentUser } from "./session";

const CATEGORIES = new Map([
  ["bug", "Bug"],
  ["idea", "Idea"],
  ["ui", "UI issue"],
  ["other", "Other"],
]);

export const submitFeedback = createServerFn({ method: "POST" })
  .validator((data: { message: string; page: string; category?: string; element?: { selector?: string; text?: string; rect?: string } | null }) => ({
    message: String(data.message ?? "").trim().slice(0, 2000),
    page: String(data.page ?? "").trim().slice(0, 200),
    category: CATEGORIES.has(String(data.category)) ? String(data.category) : "other",
    element: data.element
      ? {
          selector: String(data.element.selector ?? "").trim().slice(0, 300),
          text: String(data.element.text ?? "").trim().slice(0, 120),
          rect: String(data.element.rect ?? "").trim().slice(0, 60),
        }
      : null,
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
          title: `Feedback — ${CATEGORIES.get(data.category) ?? "Other"}`,
          description: data.message,
          color: 0xf5a623,
          fields: [
            { name: "From", value: `@${user.username ?? user.email}`, inline: true },
            { name: "Page", value: data.page || "unknown", inline: true },
            { name: "Category", value: CATEGORIES.get(data.category) ?? "Other", inline: true },
            ...(data.element?.selector
              ? [{ name: "Element", value: `\`${data.element.selector}\`${data.element.text ? `\n“${data.element.text}”` : ""}${data.element.rect ? `\n${data.element.rect}` : ""}`.slice(0, 1024) }]
              : []),
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
