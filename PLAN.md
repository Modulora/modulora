# Core Build Plan

> Repository: `Modulora/modulora` · Status: approved planning baseline

## Mission

Build the public, self-hostable Modulora registry: discovery, free creator profiles, creator-authorized publishing, immutable component releases, transparent trust evidence, moderation, and the public API used by the CLI and coding agents.

## Ownership boundary

This repository owns:

- TanStack Start web application and shadcn/ui product interface;
- Better Auth integration and application authorization;
- public catalog, search, creator profiles, organizations, and namespaces;
- GitHub App publishing workflow;
- immutable releases, evidence records, moderation, and revocation;
- public HTTP API and non-executing job orchestration;
- PostgreSQL schema and reference self-host deployment.

It does not own:

- companion schemas and compatibility rules (`Modulora/spec`);
- installer behavior (`Modulora/cli`);
- hosted private registries, billing, promotion, or commerce (`Modulora/cloud`);
- production deployment definitions (`Modulora/infra`);
- arbitrary untrusted builds before the sandbox gate.

## Dependencies

| Dependency | Required contract |
|---|---|
| `.github` | Security policy, contribution defaults, CODEOWNERS/rulesets |
| `spec` | Versioned item, attestation, evidence schemas and fixtures |
| `cli` | API/manifest feedback; core must not import CLI implementation |
| `infra` | Cloudflare/Neon development and deployment bindings |
| `cloud` | May extend core through public interfaces; core never imports cloud |

## Target architecture

```text
apps/
  web/                 # TanStack Start + shadcn/ui
  api/                 # public CLI/MCP/API boundary
  jobs/                # non-executing queue consumers
packages/
  domain/              # catalog, publishing, evidence, moderation rules
  db/                  # provider-neutral PostgreSQL schema/repositories
  auth/                # Better Auth configuration + authorization services
  evidence/            # public evidence model implementation
  ui/                  # Modulora product components and tokens
  config/              # typed environment/runtime configuration
```

The first deploy may bundle web and API into one Worker. Package boundaries remain separate so they can split without rewriting domain logic.

## Milestone 0 — Governance and scaffold

### Deliverables

- AGPL-3.0-only core and DCO 1.1/no-CLA contribution policy; legal review remains required before platform launch.
- TanStack Start workspace with Cloudflare Vite integration.
- shadcn/ui initialized with Modulora design tokens and supplied brand assets.
- TypeScript strict mode, formatting, lint, tests, dependency policy, and secret scanning.
- Environment schema with no committed credentials.
- Architecture dependency checks preventing public imports from private packages.

### Acceptance

- Local development starts with one documented command.
- Production build and Worker dry-run succeed.
- CI runs on clean checkout and fork-safe pull requests.
- README and docs match actual commands.

## Milestone 1 — Identity and creator profiles

### Deliverables

- Better Auth with secure cookie sessions and PostgreSQL storage.
- Passkeys and MFA enrollment.
- Session/device inventory and revocation.
- Organizations, memberships, invitations, and roles.
- Free creator profile with links and core customization.
- Namespace reservation and protected/confusable-name checks.
- Step-up authentication service for publishing and ownership actions.

### Acceptance

- Every resource authorization is tested server-side.
- Publisher/admin MFA policy is enforced.
- Recovery, OAuth linking, invitation expiry, role changes, and session rotation have integration tests.
- Profile creation remains free and does not grant publishing automatically.

## Milestone 2 — Authorized catalog alpha

### Deliverables

- Least-privilege Modulora GitHub App.
- Signed, replay-protected, idempotent webhooks.
- Repository selection and exact-commit source references.
- Manual/controlled import of creator-authorized shadcn items.
- Component, creator, category, tag, compatibility, source-model, and license records.
- Public component pages using screenshots only.
- PostgreSQL search and filters.
- External commercial listing with “Source not assessed” disclosure; domain verification is optional during alpha and unverified destinations are labeled.
- Report, takedown, and moderation audit events.

### Acceptance

- No unclaimed mirrored listing can be published.
- HTML/Markdown/images/URLs pass sanitization and redirect tests.
- Repository transfer/revocation removes future publishing authority.
- Ten design-partner creators and 200 authorized listing candidates are supported.

## Milestone 3 — Immutable publishing beta

### Deliverables

- Strict parsing against `@modulora/spec`.
- Draft normalization showing files, targets, dependencies, source, and license.
- Explicit release authorization by an allowed publisher with step-up auth.
- Immutable version and append-only event history.
- File digests, source commit, baseline non-executing scans, and platform attestation.
- Separate owner/source/signature/scan/build/review/revocation evidence.
- Deprecation and emergency revocation.
- Public shadcn item, Modulora companion manifest, attestation, and evidence endpoints.

### Acceptance

- Mutation of a published version is impossible through application APIs.
- Revocation propagates to API and CLI clients under the documented cache SLA.
- Malformed, oversized, traversal, unsafe-target, secret, and Unicode-confusable fixtures fail safely.
- Evidence pages name scope, time, tool/policy version, and limitations.

## Milestone 4 — Public API and agent discovery

### Deliverables

- Versioned API matching the public OpenAPI contract.
- Search, component, version, evidence, source, and revocation endpoints.
- ETags, cache semantics, pagination, stable errors, and rate limits.
- Read-only MCP/agent discovery support through published integrations.
- Privacy-preserving successful-install event endpoint.

### Acceptance

- Contract tests run against spec fixtures and generated client.
- API cannot bypass visibility, ownership, revocation, or evidence rules.
- Machine-readable responses cite exact component versions and creators.
- No write-capable MCP path exists.

## Milestone 5 — Deployment and self-hosting

### Deliverables

- Cloudflare Worker + Static Assets deployment for the web application.
- API Worker boundary and Queue producer/consumer wiring.
- R2 artifact metadata integration.
- Neon development PostgreSQL through Hyperdrive.
- Standard PostgreSQL-compatible migrations and Node/Docker self-host reference.
- Observability, health checks, rate limits, backups, and restore documentation.

### Acceptance

- Fresh self-host deployment works without private cloud packages.
- Development, preview, test, and production data are isolated.
- Web/API/jobs use separate least-privilege roles.
- Restore and deployment rollback are exercised.

## Test contract

- Unit tests for domain rules and authorization.
- Integration tests against ephemeral PostgreSQL.
- Contract tests against `Modulora/spec` fixtures.
- Browser tests for auth, profile, publish, listing, report, and revocation flows.
- Security tests for CSRF, account linking, recovery, role escalation, webhook replay, content injection, IDOR, and rate limits.
- Accessibility tests for every product flow.

## Explicit non-goals

- Hosted paid-source custody or checkout.
- Live arbitrary component execution before independent sandbox review.
- Automatic/background component updates.
- AI component generation or framework conversion.
- Vue/Svelte publishing during the React launch phase.
- Ratings/comments before abuse and reputation design.

## Definition of done

The core is ready for public beta when:

- ten creators can self-publish authorized immutable releases;
- at least 200 listings are searchable and correctly attributed;
- public API and CLI contract tests pass;
- publishing, account, moderation, and revocation security gates pass;
- open-source installs remain free;
- external commercial listings clearly hand off to creator websites;
- self-hosting works without Modulora Cloud;
- incident and takedown procedures are operational.

## Handoffs

- Publish schema/API change requests as RFCs in `Modulora/spec`.
- Give `Modulora/cli` versioned fixtures and a stable staging API.
- Expose only public extension interfaces to `Modulora/cloud`.
- Request bindings and deployment changes through `Modulora/infra`.
