# Modulora Product Strategy

> Status: working strategy · Updated: 2026-07-11

## Product thesis

Modulora is a creator-first component registry for developers and coding agents.

Creators publish from canonical sources, retain attribution and control, and choose whether their work is open source or commercially distributed. Developers discover components and install supported releases through a consistent CLI or send them to a coding agent.

The product begins with React components and shadcn registry compatibility. Vue and Svelte are future first-class ecosystems, gated by creator supply and developer demand. Modulora's brand and core data model remain framework-neutral.

## Brand promise

**Discover your next great component.**

> Browse open and premium components from trusted creators. Install with one command—or let your coding agent handle it.

“Premium” describes creator-controlled commercial distribution. It does not mean payment improves quality, ranking, or trust.

## Problem

Component discovery is fragmented across libraries, galleries, GitHub repositories, social posts, and paid storefronts. Coding agents make integration easier but also make source provenance, creator attribution, version identity, and safe installation more important.

Existing products prove demand but leave an open lane:

- discovery without a durable creator/provenance model;
- code access or installation gated behind buyer subscriptions;
- registries tied to one platform or framework;
- commercial listings with inconsistent ownership and security disclosure;
- ambiguous “verified” or “safe” labels;
- private registry products that do not connect naturally to a public creator ecosystem.

Modulora should not position itself around unsubstantiated allegations against competitors. The product wins by implementing a better model.

## Users

### Creator

An independent developer, studio, design-system team, or component company that wants distribution without losing identity or control.

Jobs:

- Publish from a canonical source.
- Receive attribution and a durable creator profile.
- Show open or commercial work.
- Understand discovery and install outcomes.
- Correct, deprecate, transfer, or revoke releases.
- Promote eligible work without buying trust.

### Developer

A person building an application who wants to find a suitable component quickly.

Jobs:

- Search by the interface job, not only a component name.
- Compare compatibility, dependencies, maintenance, source model, and evidence.
- Install an exact release with predictable changes.
- Send a component to a coding agent.

### Coding agent

A tool acting on behalf of a developer.

Jobs:

- Search and compare structured component metadata.
- Cite the creator and exact release.
- Produce an installation plan.
- Use the same CLI and policy path as a human rather than bypassing consent.

### Team

An agency, product organization, or design-system group distributing private components.

Jobs:

- Publish and search a private registry.
- Control roles, tokens, approvals, and policies.
- Audit publishing and installation.
- Give agents safe access to approved components.

## Product principles

1. **Creator authorized.** No unclaimed mirrors at launch.
2. **Canonical source.** Index and attest creator-controlled repositories rather than appropriating code.
3. **Public means free.** Public profiles, open-source code, baseline evidence, CLI installs, and MCP discovery remain free.
4. **Commercial means creator controlled.** External purchase links launch before Modulora custody.
5. **Agents use the same safety path.** Discovery may be automatic; writes go through the CLI plan and policy.
6. **Evidence over badges.** Name what was verified, scanned, signed, built, or reviewed.
7. **Promotion is separate.** Payment cannot affect organic rank, security evidence, verification, or moderation.
8. **Open protocol, replaceable host.** Specs, CLI, and public core remain usable without Modulora Cloud.
9. **Security blocks scope.** Unsafe execution or custody waits rather than shipping behind a disclaimer.
10. **Ease is the surface.** Complexity belongs in the platform; creator and developer flows stay simple.

## Launch product

### Public catalog

- Search and filters.
- Free creator profiles.
- Creator-authorized listings.
- Screenshots, documentation, compatibility, dependencies, license/source model, support status.
- Evidence states and version history.
- Report, takedown, deprecation, and revocation.

### Open-source component

- Full source display where licensing permits.
- Canonical source and creator attribution.
- Exact immutable versions.
- shadcn-compatible registry endpoint.
- `modulora add @creator/component@version` install path.
- Agent-readable metadata and read-only MCP discovery.

### External commercial component

- Public creator profile, listing, screenshot, description, compatibility, and creator-selected samples.
- Verified creator-controlled destination domain.
- Creator-provided pricing/terms label.
- Clear handoff to purchase on the creator website.
- Explicit “Source not assessed by Modulora” unless a separate review program applies.
- No hosted source, entitlements, payouts, or platform fee at launch.

### Creator publishing

- Better Auth account and organization.
- Passkey/MFA required before publishing.
- Least-privilege GitHub App connection.
- Namespace claim.
- shadcn import and Modulora companion metadata.
- Preview of normalized release.
- Explicit immutable publish authorization.
- Evidence generation and release history.

### CLI

- Search, info, dry run, diff, add, verify, and update planning.
- Signed/digest-checked immutable releases.
- Safe target policy, atomic writes, rollback, and lockfile.
- No arbitrary creator scripts.

## Not in the launch product

- Hosted paid-source delivery.
- Marketplace checkout, tax, payouts, refunds, or chargebacks.
- Arbitrary live component execution.
- Automatic/background updates.
- Write-capable MCP tools.
- AI component generation or cross-framework conversion.
- Vue/Svelte publishing.
- Ratings/comments before abuse and reputation design.
- Visual page builder.

## Business model

### Free public ecosystem

- Browse and search.
- Free creator profile and core customization.
- Unlimited authorized public listings.
- Open-source code display and install.
- Baseline ownership/provenance/security evidence.
- CLI, API, MCP discovery, and self-hosting.
- External commercial links.

There is no buyer membership for public/open components.

### Paid promotion

Test only after traffic is measurable:

- Manual fixed-duration placements, beginning with a $49/week hypothesis.
- Clearly labeled Sponsored.
- Eligibility under the same ownership, moderation, and evidence rules.
- Separate sponsored inventory and organic rank.
- Aggregate impressions, visits, purchase-link clicks, and successful installs.

### Modulora Cloud private registries

Pricing hypotheses to validate with design partners:

| Plan | Hypothesis | Value |
|---|---:|---|
| Team | $15/seat monthly or $12 annually; 3-seat minimum | Private registries, roles, tokens, hosted evidence, 30-day audit |
| Business | $29/seat monthly; 10-seat minimum | SSO, policies, approvals, one-year audit, priority support |
| Enterprise | Custom annual | SCIM, dedicated deployment/region options, custom retention, SLA |

Do not publish final prices before five teams complete the pilot and at least three demonstrate willingness to pay.

### Creator Pro, later

A possible $15/month hypothesis for measurable business tooling:

- Advanced aggregate analytics.
- Custom domain.
- Advanced profile branding.
- Webhooks and release channels.
- Lead capture.

The profile, listings, ownership verification, and baseline evidence remain free.

### Hosted commercial delivery, later

External creator purchase links remain free. If Modulora later handles checkout, entitlement, signed delivery, updates, refunds, and disputes, test a 10% fee. This requires a separate legal, security, fraud, and operations program.

## Go-to-market

### Supply first

- Recruit 10 respected launch creators.
- Help them connect existing shadcn registries without migration.
- Publish creator-authored collections and technical stories.
- Make canonical attribution and free profiles concrete benefits.
- Launch with 200 authorized components rather than a large scraped catalog.

### Developer acquisition

- Free CLI and read-only MCP integration.
- GitHub Action that emits/validates Modulora companion manifests.
- Search pages for component jobs and technical compatibility.
- Objective comparison based on source model, dependencies, maintenance, compatibility, and evidence.
- Integrate with existing tools such as scn-stack without absorbing their brands.

### Team acquisition

Target agencies and product teams with internal component folders but weak discovery/governance. Sell a pilot around measurable outcomes:

- less duplicate implementation;
- fewer unsafe agent-generated replacements;
- faster use of approved components;
- clearer publishing and install audit history.

## Metrics

### North star

Monthly successful installs of immutable, creator-authorized releases.

### Initial gates

- 10 active verified creators.
- 200 authorized listings before public launch.
- 500 immutable releases after publishing beta.
- 1,000 monthly successful installs across 100 repositories.
- 30% four-week installer retention.
- 5 private-registry pilots and 3 paying commitments before fixed pricing.
- Ownership/license disputes below 2% of listings.
- Median security report acknowledgement under 24 hours.

## Key risks

| Risk | Response |
|---|---|
| Empty marketplace | Recruit supply before broad launch; do not build marketplace payments first |
| Scraping required for density | Reject the premise; reshape rather than abandon authorization standards |
| Security claims outrun evidence | Separate trust states and state limitations |
| Creator account takeover | Passkey/MFA, step-up auth, transfer controls, immutable history |
| Malicious code/registry payload | Strict parser, safe CLI, sandbox gates, signatures, revocation |
| External purchase phishing | Verify domains, monitor redirects, clear handoff and reporting |
| Promotion corrupts trust | Separate data path, labels, eligibility rules, no rank/evidence influence |
| Framework sprawl | React first; gate Vue and Svelte separately |
| Open core feels crippled | Keep the complete public registry and trust model self-hostable |
| Operations exceed team | Delay sandbox execution and commercial custody until staffed/reviewed |

## Decisions made

- Name: Modulora.
- Tagline: “Discover your next great component.”
- Brand: warm discovery, confident clarity, technical precision, creator-first.
- Launch framework: React; Vue and Svelte later.
- Product UI: shadcn/ui.
- Web framework: TanStack Start with framework-neutral domain/API boundaries.
- Auth candidate: Better Auth.
- Development database: Neon PostgreSQL project `steep-resonance-36850182`; production provider remains undecided.
- Deployment baseline: Cloudflare Workers with Static Assets for TanStack Start, separate Worker/API boundaries, Queues for asynchronous orchestration, and R2 for artifacts. Pages is optional, not required.
- Registry compatibility: shadcn schema plus Modulora companion manifest.
- GitHub structure: hybrid split.
- Open-core model: self-hostable public core plus proprietary cloud extensions.
- Commercial launch: external creator purchase links; hosted source later.
- Public profiles and public/open installs: free.

## Open decisions

- PostgreSQL access/query layer.
- Queue and worker implementation.
- KMS/signature algorithm and transparency mechanism.
- Exact shadcn policy profile and companion schema.
- Search ranking inputs and anti-manipulation policy.
- Creator publishing terms and contribution agreement.
- Cloud deployment providers and sandbox technology.
- Install telemetry default and privacy policy.
- Final pricing after design-partner validation.
