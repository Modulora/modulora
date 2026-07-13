<p align="center"><img src="https://raw.githubusercontent.com/Modulora/.github/main/assets/brand/social-header.png" alt="Modulora — Discover your next great component" width="100%"></p>

# Modulora

**Discover your next great component.**

Modulora is a creator-first component registry for developers and coding agents. Creators publish from canonical sources and keep control of their work. Developers discover open and commercial components and install supported releases through a consistent CLI.

> Modulora is preparing for a limited alpha. The platform application exists,
> but it isn't authorized for production deployment yet.

## Alpha commerce boundary

Modulora doesn't process component or collection purchases during alpha.
Commercial listings can link to a purchase page on a domain the creator has
verified. The creator handles checkout, licensing, delivery, updates, refunds,
and support; Modulora doesn't host or assess the paid source, record the
purchase, or take a transaction fee.

Direct marketplace code remains disabled behind
`VITE_DIRECT_MARKETPLACE_ENABLED=false`. Profit-share payouts for verified CLI
installs are a separate system and remain in alpha scope.

## Product direction

- React first; Vue and Svelte later.
- Built with TanStack Start and shadcn/ui.
- Compatible with the shadcn registry format plus a Modulora provenance companion manifest.
- Better Auth for self-hostable identity, sessions, passkeys, MFA, and organizations.
- Cloudflare Workers + Static Assets, Queues, and R2.
- PostgreSQL, with Neon used for shared development.
- Free public creator profiles, listings, open-source code, and installs.
- External creator purchase links for commercial components at launch.

## Repository role

This is the public, self-hostable core:

- public catalog and creator profiles;
- publishing and immutable release history;
- provenance, evidence, moderation, and revocation;
- TanStack Start web application;
- public API and non-executing job orchestration;
- PostgreSQL schema and reference deployment.

The protocol and installer live in [`Modulora/spec`](https://github.com/Modulora/spec) and [`Modulora/cli`](https://github.com/Modulora/cli). Hosted private-registry, direct marketplace, billing, and enterprise capabilities are outside the alpha core.

## Planning documents

Start with [`docs/README.md`](./docs/README.md).

- [Product strategy](./docs/product-strategy.md)
- [Brand](./docs/brand.md)
- [Architecture](./docs/architecture.md)
- [Security model](./docs/security.md)
- [GitHub organization](./docs/github-organization.md)
- [Delivery roadmap](./docs/roadmap.md)

## Current status

See [`CHECKLIST.md`](./CHECKLIST.md) for the repository bootstrap and first vertical slice.

## Security

Do not report vulnerabilities in public issues. A private reporting process will be published before executable registry or authentication code ships.

## Build plan

- [`PLAN.md`](./PLAN.md) — self-contained scope, dependencies, milestones, acceptance criteria, security/test gates, and definition of done.
- [`CHECKLIST.md`](./CHECKLIST.md) — concise progress tracker.

## License

The public core is licensed under `AGPL-3.0-only`. Contributions use the Developer Certificate of Origin 1.1 with no CLA. See [`LICENSING.md`](./LICENSING.md). Creator components retain their declared per-component licenses.
