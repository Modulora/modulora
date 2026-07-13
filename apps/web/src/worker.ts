/**
 * Custom Worker entry: TanStack Start handles fetch; we add the cron
 * handler for scheduled jobs (weekly creator digest). `process.env` is
 * populated by the framework inside fetch, but not for scheduled events,
 * so we copy bindings in before running anything.
 */
import handler from "@tanstack/react-start/server-entry";
import { runWeeklyDigest } from "./lib/weekly-digest";

export default {
  // The framework handler's request type is narrower than ExportedHandler's;
  // they're runtime-compatible.
  fetch: handler.fetch as unknown as ExportedHandler["fetch"],
  async scheduled(_event, env, ctx) {
    for (const [key, value] of Object.entries(env as Record<string, unknown>)) {
      if (typeof value === "string") process.env[key] = value;
    }
    ctx.waitUntil(
      runWeeklyDigest().then((result) =>
        console.log(`[digest] weekly run: ${result.sent}/${result.creators} creators emailed`),
      ),
    );
  },
} satisfies ExportedHandler;
