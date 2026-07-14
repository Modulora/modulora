# Deploy secrets

The `modulora-web` worker reads all configuration from `process.env.*`. Before
(or immediately after) the first deploy — and whenever a value is rotated — the
sensitive values must be set as **Cloudflare Worker secrets**. Bindings that are
not secrets (R2 `MEDIA`, custom domain routes) live in `wrangler.jsonc`.

> Platform features are dev-only for now (see repo issue #29). Set these before
> flipping any platform feature live.

## Deployment safety before go-live

Cloudflare Workers Builds uses `main` as its production branch. Builds for
non-production branches are disabled, so pull requests run GitHub CI without
uploading or deploying Worker versions. Keep that setting disabled until an
authorized preview-environment plan exists.

Do not retry or enable Cloudflare deployment merely to make a pull-request
check green. Before go-live, verify the root build command, the
`apps/web` Wrangler deploy command, production secrets, bindings, and custom
domains as one explicit release operation.

## One command

From `apps/web`, with a populated `.env`:

```bash
./scripts/sync-secrets.sh            # reads apps/web/.env
./scripts/sync-secrets.sh .env.prod  # or a dedicated prod env file
```

The script pipes each value directly to `npx wrangler secret put <KEY>` — values
are never printed. Verify afterwards:

```bash
npx wrangler secret list
```

## Required secrets

| Key | Purpose | Sensitive |
|---|---|---|
| `BETTER_AUTH_SECRET` | Better Auth signing key | yes |
| `BETTER_AUTH_URL` | Canonical auth origin (e.g. `https://modulora.dev`) | config |
| `DATABASE_URL` | Neon Postgres connection string | yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth app id | config |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret | yes |
| `TWITTER_CLIENT_ID` | X (Twitter) OAuth 2.0 client id | config |
| `TWITTER_CLIENT_SECRET` | X (Twitter) OAuth 2.0 client secret | yes |
| `RESEND_API_KEY` | Resend transactional email key | yes |
| `RESEND_FROM` | From address (`mail.modulora.dev`) | config |
| `DISCORD_WEBHOOK_URL` | Waitlist **reservations** channel | yes |
| `REPORT_WEBHOOK_URL` | Component **reports** channel | yes |
| `REVIEW_WEBHOOK_URL` | Curation **review** channel | yes |

All three Discord webhooks must be present remotely or the corresponding feature
degrades gracefully (submission still succeeds, but no message is posted).

## Not runtime secrets

- `VITE_SANDPACK_BUNDLER_URL` — build-time only. Points the live preview at the
  self-hosted Sandpack bundler. Prod: `https://sandpack.modulora.dev` (deploy
  the assets worker in `modulora-infra/workers/sandpack`; see Modulora/modulora#44).
- `VITE_EXTERNAL_DOMAIN_VERIFICATION_REQUIRED` — build-time feature flag.
  Keep `false` during alpha to accept external component and collection links
  without DNS verification. Set `true` to restore server and editor enforcement.

## R2 bucket

The `modulora-media` bucket (avatars, preview assets) is bound in
`apps/web/wrangler.jsonc`. Create it once before deploy:

```bash
npx wrangler r2 bucket create modulora-media
```
- `NODE_ENV` — provided by the runtime.

## Alpha access gate

`ALPHA_ALLOWLIST` — comma-separated bootstrap operator emails. When set, the
product requires either an allowlisted account or an accepted, non-revoked
alpha invitation. Invitation and password-reset pages remain public so a
waitlist member can finish setup; other gated routes redirect to `/signin`,
and gated APIs return 401 without an eligible authenticated session or CLI
bearer token. Keep the owner account allowlisted until the alpha opens.

Production `BETTER_AUTH_URL` must be exactly `https://modulora.dev`; otherwise
GitHub generates a localhost OAuth callback. The GitHub OAuth App callback is
`https://modulora.dev/api/auth/callback/github`.

## Platform owner

`OWNER_USER_IDS` — comma-separated user IDs gating /admin (profit-share
distribution runs). IDs, not emails: emails are assertions (registerable,
case-collidable, provider-asserted), ids are immutable and ours. Separate
from curator status: curators review content, owners move money. Unset =
the admin surface 404s for everyone. Find your id in the `user` table after
first sign-in.
