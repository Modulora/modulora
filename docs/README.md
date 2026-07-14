# Modulora Planning Documents

These documents define the current product, architecture, security, organization, brand, and delivery plan.

## Current alpha boundary

Direct marketplace checkout isn't live. The alpha supports free hosted source,
verified installs, creator profit share, and external commercial links. Domain
verification is optional during alpha; unverified destinations are disclosed.
External creators own the transaction and fulfillment; Modulora doesn't hold
paid source, grant buyer entitlements, record purchases, or collect a
transaction fee.

## Reading order

1. [`product-strategy.md`](./product-strategy.md) — product thesis, users, scope, business model, GTM, metrics, and decisions.
2. [`brand.md`](./brand.md) — tagline, positioning, voice, vocabulary, and sample copy.
3. [`architecture.md`](./architecture.md) — stack, open-core boundary, registry model, services, data entities, workflows, and CLI contract.
4. [`security.md`](./security.md) — threat model, account/publisher/artifact/CLI/sandbox controls, and release gates.
5. [`github-organization.md`](./github-organization.md) — public/private repositories, access, rulesets, CODEOWNERS, Actions, and transfer plan.
6. [`roadmap.md`](./roadmap.md) — gated phases, metrics, staffing, first backlog, and deferred scope.
7. [`payout-human-verification.md`](./payout-human-verification.md) — human test-mode acceptance and live-money stop conditions for Stripe Connect and profit-share transfers.
8. [`research-and-decisions.md`](./research-and-decisions.md) — historical research and earlier iterations; not the current source of truth.

## Sources of truth

When documents overlap, use this precedence:

1. Security constraints in `security.md`.
2. Architecture boundaries in `architecture.md`.
3. Product scope and business rules in `product-strategy.md`.
4. Delivery sequencing in `roadmap.md`.
5. Brand language in `brand.md`.
6. Historical notes only for background.

## Current decisions

- **Name:** Modulora
- **Tagline:** Discover your next great component.
- **Launch ecosystem:** React; Vue and Svelte later
- **Product UI:** shadcn/ui
- **Registry compatibility:** shadcn registry plus a Modulora companion manifest
- **Web framework:** TanStack Start
- **Authentication candidate:** Better Auth
- **Deployment:** Cloudflare Workers + Static Assets, Queues, and R2; Neon via Hyperdrive for development
- **Distribution:** public open-source installs; external creator purchase links for commercial components at launch
- **Business model:** free public ecosystem and creator profit share during alpha; paid promotion, private registries, and direct hosted commerce require later gates
- **Source model:** self-hostable open core plus proprietary Modulora Cloud extensions
- **GitHub organization:** hybrid public core/spec/CLI split with private cloud/infra

## Change discipline

Important changes should update all affected source-of-truth documents in the same pull request. Examples:

- New trust label: `security.md`, `architecture.md`, and UI copy in `brand.md`.
- New paid capability: `product-strategy.md`, `architecture.md`, `security.md`, and `roadmap.md`.
- New repository: `github-organization.md` and dependency diagram in `architecture.md`.
- Framework expansion: `product-strategy.md`, `architecture.md`, `security.md`, and `roadmap.md`.
