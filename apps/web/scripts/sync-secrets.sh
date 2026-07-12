#!/usr/bin/env bash
#
# Sync required Cloudflare Worker secrets from a local .env into the deployed
# `modulora-web` worker. Run this whenever a secret is added or rotated, and as
# part of first-time deploy setup. Values are piped straight to wrangler and are
# never printed.
#
#   ./scripts/sync-secrets.sh              # uses apps/web/.env
#   ./scripts/sync-secrets.sh .env.prod    # uses a specific file
#
# Non-sensitive config (BETTER_AUTH_URL, RESEND_FROM, NODE_ENV) can also live in
# wrangler.jsonc "vars"; they are included here so a single source (.env) stays
# authoritative. HUGEICONS_TOKEN is a build-time-only token (CI install), not a
# runtime secret, so it is intentionally excluded.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env}"
[ -f "$ENV_FILE" ] || { echo "error: $ENV_FILE not found"; exit 1; }

# Runtime secrets the worker reads via process.env.* (keep in sync with source).
SECRETS=(
  BETTER_AUTH_SECRET
  BETTER_AUTH_URL
  DATABASE_URL
  GITHUB_CLIENT_ID
  GITHUB_CLIENT_SECRET
  RESEND_API_KEY
  RESEND_FROM
  DISCORD_WEBHOOK_URL   # waitlist reservations channel
  REPORT_WEBHOOK_URL    # component reports channel
  REVIEW_WEBHOOK_URL    # curation review channel
)

missing=()
for key in "${SECRETS[@]}"; do
  val="$(grep -E "^${key}=" "$ENV_FILE" | head -1 | sed "s/^${key}=//; s/^\"//; s/\"\$//")"
  if [ -z "$val" ]; then
    missing+=("$key")
    continue
  fi
  printf '%s' "$val" | npx wrangler secret put "$key" >/dev/null && echo "  set  $key"
done

if [ ${#missing[@]} -gt 0 ]; then
  echo ""
  echo "warning: no value in $ENV_FILE for: ${missing[*]}"
fi

echo ""
echo "Done. Verify with: npx wrangler secret list"
