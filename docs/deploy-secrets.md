# Deploy secrets

The `modulora-web` worker reads all configuration from `process.env.*`. Before
(or immediately after) the first deploy — and whenever a value is rotated — the
sensitive values must be set as **Cloudflare Worker secrets**. Bindings that are
not secrets (R2 `MEDIA`, custom domain routes) live in `wrangler.jsonc`.

> Platform features are dev-only for now (see repo issue #29). Set these before
> flipping any platform feature live.

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
| `RESEND_API_KEY` | Resend transactional email key | yes |
| `RESEND_FROM` | From address (`mail.modulora.dev`) | config |
| `DISCORD_WEBHOOK_URL` | Waitlist **reservations** channel | yes |
| `REPORT_WEBHOOK_URL` | Component **reports** channel | yes |
| `REVIEW_WEBHOOK_URL` | Curation **review** channel | yes |

All three Discord webhooks must be present remotely or the corresponding feature
degrades gracefully (submission still succeeds, but no message is posted).

## Not runtime secrets

- `HUGEICONS_TOKEN` — build-time only, used by CI/`.npmrc` to install
  `@hugeicons-pro/*`. Set it as a CI/build environment variable, not a worker
  secret.
- `VITE_SANDPACK_BUNDLER_URL` — build-time only. Points the live preview at the
  self-hosted Sandpack bundler. Prod: `https://sandpack.modulora.dev` (deploy
  the assets worker in `modulora-infra/workers/sandpack`; see Modulora/modulora#44).

## R2 bucket

The `modulora-media` bucket (avatars, preview assets) is bound in
`apps/web/wrangler.jsonc`. Create it once before deploy:

```bash
npx wrangler r2 bucket create modulora-media
```
- `NODE_ENV` — provided by the runtime.
