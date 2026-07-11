# Modulora Delivery Roadmap

> Status: planning baseline · Updated: 2026-07-11

Modulora is a large security-sensitive platform. The roadmap is organized around evidence and release gates rather than optimistic feature dates. Each phase must produce a usable vertical slice and prove the assumptions required for the next one.

## Delivery principles

1. **Supply before marketplace mechanics.** Recruit creators and authorized components before building monetization.
2. **Read-only before code execution.** Discovery and metadata can launch before preview/build sandboxes.
3. **Open source before commercial custody.** External purchase links precede hosted paid-source delivery.
4. **CLI safety before agent writes.** MCP remains read-only until the installer has been independently reviewed.
5. **One framework first.** React launches first; Vue and Svelte require separate creator and demand gates.
6. **No security theater.** A missing control blocks the feature rather than producing a vague warning badge.
7. **No speculative infrastructure.** PostgreSQL, object storage, and a durable queue are enough until measurements prove otherwise.

## Success metrics

### North star

**Monthly successful installs of immutable, creator-authorized releases.**

An install counts only when the CLI resolves a known version, validates its digest/signature policy, and completes or intentionally hands off to the shadcn CLI under a recorded plan.

### Supporting metrics

- Active verified creators.
- Authorized published releases.
- Search-to-component-page conversion.
- Component-page-to-install-plan conversion.
- Install-plan success and rollback rates.
- Repeat installers within four weeks.
- Creator publish success/time-to-first-release.
- External purchase-link click-through.
- Security reports, confirmed incidents, and time to containment.
- Private-registry design partners and paid conversion.

Do not optimize page views, raw copied commands, or unverified install pings as primary metrics.

## Phase 0 — Company and trust foundation

**Objective:** Make the project safe to accept contributions and credible to recruit design partners.

### Deliverables

- Transfer `jal-co/modulora` into the Modulora GitHub organization.
- Create public `.github`, `spec`, and `cli` repositories and private `cloud` and `infra` repositories only when work begins.
- Replace the root MIT-only posture with the approved licensing map:
  - AGPL-3.0-only public application/core.
  - Apache-2.0 specification, CLI, SDK, and adapters.
  - Per-component creator license.
- Adopt DCO/CLA decision with counsel.
- Publish Code of Conduct, contribution guide, security policy, vulnerability-reporting channel, moderation principles, and component publishing terms.
- Reserve/validate Modulora npm scope/package, domains, and social handles after trademark review.
- Recruit:
  - 10 creator design partners.
  - 15 developers who regularly install source components.
  - 5 teams with internal component libraries.
- Write versioned first drafts of the shadcn companion manifest and evidence vocabulary.

### Exit gate

- Counsel has reviewed platform licensing and publishing terms.
- At least 10 creators explicitly agree to connect canonical repositories.
- At least 200 authorized component candidates are identified.
- Five teams agree to test a private-registry workflow; payment is not yet required.
- Threat model and architecture receive independent review.

### Do not build yet

- Billing, promotion auctions, payouts, hosted paid source, AI generation, live untrusted previews.

## Phase 1 — Discovery-only alpha

**Objective:** Prove that developers value a creator-authorized, searchable catalog before installing through Modulora.

### User capabilities

- Browse/search component listings.
- View creator profiles, screenshots, docs, compatibility, dependencies, license/source model, and evidence placeholders.
- Open the canonical source for open components.
- Follow verified creator purchase links for external commercial components.
- Create a free creator profile and claim a namespace through GitHub App/domain verification.

### Technical scope

- TanStack Start app built with shadcn/ui.
- Better Auth users, passkeys/MFA, sessions, organizations, and basic roles.
- PostgreSQL catalog and moderation schema.
- GitHub App with least-privilege installation and verified webhooks.
- Manual/controlled ingestion from exact commits; no automatic publishing.
- Search in PostgreSQL.
- Sanitized Markdown, proxied images, screenshots only; no creator code execution.
- Reporting/takedown and admin moderation audit trail.
- External commercial link verification and clear “Source not assessed” disclosure.

### Security gate

- Publisher/admin MFA and step-up authentication.
- Recovery and account-linking review.
- Resource-level authorization tests.
- Webhook signature/replay/idempotency tests.
- Content sanitization and URL redirect controls.
- No unclaimed mirrors.

### Product gate

- 10 active creators and 200 authorized listings.
- 100 weekly returning developers or equivalent interview-backed engagement.
- At least 20% of search sessions reach a component page.
- At least 10 external purchase-link clicks with no misleading-source incidents.

## Phase 2 — Public publishing beta

**Objective:** Let creators publish immutable open releases with transparent evidence.

### User capabilities

- Import shadcn registry items from approved repositories.
- Review normalized files, dependencies, targets, source, license, and release metadata.
- Explicitly authorize a versioned release.
- Deprecate or request revocation.
- View owner/source/artifact/scan evidence separately.

### Technical scope

- `spec` repository with versioned JSON Schemas and fixtures.
- Strict ingestion parser and path/target policy.
- Immutable object storage and append-only release events.
- Canonical serialization, digests, platform attestations, key rotation/revocation model.
- Baseline secret, dependency, license, and static analysis that does not execute creator code.
- Public shadcn-compatible item endpoint pinned to exact versions.
- Public evidence API and component version history.

### Security gate

- Artifact/signing design reviewed.
- KMS-backed signing key; web and workers cannot access key material.
- Malicious manifest, path traversal, Unicode-confusable, oversized input, and secret-leak fixtures pass.
- Release revocation reaches website/API clients promptly.
- Evidence labels and limitations pass copy/security review.

### Product gate

- 80% of design partners can publish without maintainer intervention.
- Median time from connected repository to draft under 10 minutes.
- At least 500 immutable releases with fewer than 2% ownership/license disputes.

## Phase 3 — Secure CLI beta

**Objective:** Make installation safer and easier for humans and agents.

### User capabilities

```bash
modulora search "date picker"
modulora info @creator/calendar
modulora add @creator/calendar@1.2.0 --dry-run
modulora diff @creator/calendar@1.2.0
modulora add @creator/calendar@1.2.0
modulora verify
```

- Project/framework/package-manager detection.
- Exact version resolution.
- Signature/digest/revocation verification.
- Plan/diff before writes.
- Atomic install, backup, rollback, and `modulora.lock`.
- Explicit dependency and high-impact configuration approval.

### Technical scope

- Apache-2.0 CLI and installer engine in separate repository.
- shadcn-compatible adapter without forking shadcn's schema.
- Secure npm publishing using protected environments and trusted publishing/OIDC.
- Read-only MCP and SKILL.md adapters after CLI API stabilizes.
- Privacy-preserving install telemetry that is opt-in or transparently disclosed.

### Security gate

- Independent CLI security review.
- Path traversal, symlink/hardlink, case collision, overwrite, rollback, malformed signature, and dependency-policy tests.
- No creator-provided shell commands or lifecycle scripts.
- Credentials never appear in shell history, query strings, logs, or lockfiles.
- CLI release provenance and public checksums.

### Product gate

- 95% successful installs across supported reference projects.
- Fewer than 1% unrecoverable partial installs.
- 1,000 monthly successful installs across 100 distinct repositories.
- At least 30% four-week installer retention.

## Phase 4 — Isolated previews and deeper verification

**Objective:** Add richer previews and build evidence without placing the platform at risk.

### Scope

- Hardened ephemeral microVM or equivalent sandbox service in a separate account/network.
- Controlled dependency proxy/cache.
- Build/typecheck/test policy with strict resource and time limits.
- Screenshot generation and optional isolated live previews on a separate origin.
- Evidence records tied to exact digest and policy/tool version.
- Worker kill switch, patching, observability, and forensic records.

### Security gate

- Independent sandbox architecture and penetration review.
- Confirmed inability to reach metadata services, production/control-plane networks, credentials, or other jobs.
- Tested denial-of-service controls, output limits, escape response, and worker image revocation.
- No live preview launch before this gate passes; screenshots remain the fallback.

### Product gate

- Build evidence meaningfully improves component selection/install conversion.
- Preview costs fit a sustainable per-release budget.
- False-positive and failure rates are acceptable to creators.

## Phase 5 — Modulora Cloud private-registry pilot

**Objective:** Validate the primary recurring-revenue product.

### User capabilities

- Private namespaces and repositories.
- Organization roles and publishing approvals.
- Short-lived scoped CLI/CI tokens.
- Private search and shared collections.
- Audit logs and release policy gates.
- Hosted scans and previews.

### Commercial test

- Team hypothesis: $15/seat monthly or $12 annually, three-seat minimum.
- Business hypothesis: $29/seat monthly, ten-seat minimum.
- Do not publish fixed pricing until five design partners complete the workflow and confirm willingness to pay.

### Security gate

- Tenant-isolation review and tests.
- Private artifacts never enter public search, logs, analytics, caches, or support tooling.
- Token scope, expiration, rotation, revocation, and audit coverage.
- Backup/restore and deletion/retention tests.
- Support access requires approval, audit, time limit, and user notification.

### Product gate

- Five active pilots.
- Three paying organizations or signed annual commitments.
- Measurable reduction in duplicate component implementation or unsafe agent-generated UI.
- No cross-tenant disclosure.

## Phase 6 — Paid promotion

**Objective:** Let eligible creators buy visibility without corrupting discovery or trust.

### Scope

- Manual fixed-duration placements first; $49/week is a hypothesis, not a promise.
- Separate sponsored inventory and organic ranking pipelines.
- Clear “Sponsored” label on every surface.
- Eligibility requires ownership verification and normal moderation/security policy.
- Aggregate impressions, listing visits, purchase-link clicks, and verified installs.
- Frequency caps and inventory limits.

### Launch gate

- Traffic is sufficient to provide credible value.
- Creators can see measurement methodology.
- Promotion has no effect on trust evidence, organic score, moderation, or verification.
- Fraud, bot, refund, and placement-removal policies exist.

Do not sell promotion merely to claim revenue before creators can receive measurable value.

## Phase 7 — Hosted commercial delivery

**Objective:** Support both creator-hosted and Modulora-hosted commercial source only after the external-link model proves demand.

### Scope

- Creator seller verification and commercial publishing agreement.
- Checkout, tax, invoices, refunds, chargebacks, sanctions/fraud screening.
- Encrypted artifact custody and entitlement service.
- Short-lived, user/item/version-scoped delivery grants.
- Signed private install manifests, update channels, license records, and audit logs.
- Creator payouts and dispute processes.

### Commercial hypothesis

- External creator purchase links remain free with no platform take rate.
- Test a 10% fee only when Modulora handles checkout, entitlement, delivery, updates, and disputes.

### Gate

- Separate legal, security, payment, fraud, entitlement, leakage, and operational review.
- Clear acknowledgement that installed source cannot be durable DRM.
- Support and incident staffing exists before custody begins.

## Phase 8 — Framework expansion

### Vue

Begin only when:

- 10 credible Vue creators commit at least 100 authorized components.
- Search data/interviews show sustained Vue demand.
- Vue-native manifest mapping, previews, compatibility, and installer rules are designed.
- React roadmap is not blocked by foundational security work.

### Svelte

Use the same gate independently. Do not auto-convert React components or treat framework ports as equivalent releases without creator authorization.

## Staffing model

A solo founder can validate supply, product language, schemas, and a read-only alpha. A secure registry with execution and commercial custody requires specialist review.

Minimum capabilities by phase:

| Capability | Needed by |
|---|---|
| Product/full-stack TypeScript | Phase 1 |
| Product design and developer UX | Phase 1 |
| Application security review | Phase 1 |
| Supply-chain/CLI security | Phase 2–3 |
| Sandbox/cloud isolation expertise | Phase 4 |
| B2B auth/tenant security | Phase 5 |
| Payments, fraud, tax, legal operations | Phase 7 |
| Trust and safety/moderation operations | Phase 1 onward |

Independent security review is a budgeted deliverable, not volunteer polish.

## First implementation backlog

### P0 decisions

- Final license and contribution model.
- Modulora org transfer and repository creation.
- Companion manifest v0 draft.
- Trust/evidence vocabulary v0.
- Better Auth account and organization model.
- GitHub App permission model.
- Data classification and threat model review.
- Creator publishing agreement and external-link policy.

### First vertical slice

1. TanStack Start project with shadcn/ui foundations.
2. Better Auth sign-in, passkey/MFA enrollment, session management.
3. Free creator profile and organization/namespace claim.
4. Manual import of one authorized public shadcn registry item.
5. Public component page with screenshot, creator, source, license, compatibility, and purchase/source action.
6. Search over the imported catalog.
7. Report/takedown flow and audit event.
8. No code execution and no automatic publishing.

## Program-level kill/reshape criteria

Reshape toward a private-registry security product if:

- creators will not authorize canonical repository connections;
- discovery demand depends on scraping unclaimed work;
- developers ignore creator identity and trust evidence;
- teams will not pay at least the tested floor for private governance;
- secure preview/verification costs exceed the value users perceive;
- the catalog cannot achieve useful density without compromising authorization standards.

Stop hosted commercial delivery if external purchase links satisfy creators and buyers without custody risk.
