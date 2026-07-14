# Development

The web app lives in `apps/web` (TanStack Start + Vite, deployed to Cloudflare
Workers). Shared DB schema/migrations live in `packages/db` (Drizzle + Neon).

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # fill in the values (see below)
```

Required for local dev: `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, and
`BETTER_AUTH_URL=http://localhost:5173`. Payments, OAuth, and webhooks are
optional and activate when their keys are present (`STRIPE_SECRET_KEY`,
`GITHUB_CLIENT_*`, `TWITTER_CLIENT_*`, etc.).

## Icons

Application icons come from `react-icons/hi2` (Heroicons v2 solid, MIT); brand
marks stay in `src/components/brand-icons.tsx`. `lucide-react` is not a
dependency, and the shadcn generator has no Heroicons option — when adding a
shadcn component, convert any generated `lucide-react` imports to the matching
`react-icons/hi2` icons before committing. Dynamic icon props use `IconType`
from `react-icons`.

## Everyday commands (run in `apps/web`)

```bash
pnpm dev              # app dev server (localhost:5173)
pnpm typecheck        # tsc --noEmit — run before every commit
pnpm test             # vitest (unit tests in test/)
pnpm build            # production build
pnpm storybook        # component workbench (localhost:6006)
pnpm build-storybook  # static Storybook bundle
```

Live preview needs the self-hosted Sandpack bundler on a separate origin. Build
and serve the pinned runtime from the infrastructure repository:

```bash
cd ../modulora-infra/workers/sandpack
./build.sh
python3 -m http.server 4587 --directory dist
```

Set `VITE_SANDPACK_BUNDLER_URL=http://localhost:4587` in `apps/web/.env`, then
start the app on `:5173`. A Sandpack `TIME_OUT` in local development usually
means the static server on `:4587` is not running. Run `./verify.sh
http://localhost:4587` before debugging the client. The production runtime uses
the same pinned build on the isolated `sandpack.modulora.dev` origin.

## Storybook — the component workbench

We use Storybook (TanStack-React framework) to build, review, and polish our own
UI components in isolation. **Every reusable component should have a story.**

- Stories live next to their component as `*.stories.tsx`.
- They render on the app's dark surface with our Tailwind tokens + Inter (see
  `.storybook/preview.tsx`).
- Components that use `<Link>` (e.g. the app shell) wrap in the router decorator
  at `.storybook/with-router.tsx`.
- Page-level flows that need live server functions or the Sandpack bundler
  (e.g. the Build step of the publish editor) are viewed in-app, not in
  Storybook — story the presentational sub-parts instead.

Config note: `.storybook/main.ts` strips the Cloudflare + TanStack-Start server
Vite plugins via `viteFinal` (their Workers runner-worker breaks the browser
preview build). Don't re-add the `addon-vitest` browser-test integration — it
rewrites `vitest.config.ts` and conflicts with the app's own tests.

### Adding a story

```tsx
import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Thing } from "./thing";

const meta = { title: "UI/Thing", component: Thing, tags: ["autodocs"] } satisfies Meta<typeof Thing>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { /* ... */ } };
```

If a component has required props but the story only uses `render`, add default
`args` on the `meta` so the types are satisfied.

## Database changes

```bash
cd packages/db
pnpm drizzle-kit generate   # create a migration from schema.ts
pnpm drizzle-kit push --force # apply to the configured database (required for this project)
```

## Before you commit

- `pnpm typecheck` is green.
- New/changed reusable components have (or update) a Storybook story.
- Conventional Commit message, signed off (`git commit -s`).
