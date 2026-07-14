import { env } from "cloudflare:workers";

export interface ReportRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface ReportEnv {
  REPORT_RATE_LIMITER?: ReportRateLimiter;
}

export function reportRateLimitKey(request: Request, userId: string | null | undefined): string {
  if (userId) return `user:${userId}`;
  const cloudflareIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (cloudflareIp) return `ip:${cloudflareIp}`;
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `ip:${forwardedIp || "unknown"}`;
}

export async function consumeReportRateLimit(
  request: Request,
  userId: string | null | undefined,
  limiter: ReportRateLimiter | undefined = (env as ReportEnv).REPORT_RATE_LIMITER,
): Promise<boolean> {
  // Local and test environments have no native Cloudflare binding. A missing
  // production binding is configuration drift and must not disable protection.
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.error("REPORT_RATE_LIMITER binding is missing");
      return false;
    }
    return true;
  }
  const outcome = await limiter.limit({ key: reportRateLimitKey(request, userId) });
  return outcome.success;
}
