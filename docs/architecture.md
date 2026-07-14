# Modulora Architecture

> Status: alpha architecture · Updated: 2026-07-13

## Alpha commerce boundary

The direct marketplace is disabled for alpha. Modulora doesn't process
component or collection checkout, issue buyer entitlements, maintain a purchase
library, or deliver paid source. External commercial listings point to
creator-operated purchase pages, and creators retain responsibility for every
transaction and fulfillment obligation. Domain verification is feature-flagged
with `VITE_EXTERNAL_DOMAIN_VERIFICATION_REQUIRED`; it is false during alpha,
and public listings disclose unverified destinations.

Marketplace tables and code paths can remain dormant for later evaluation, but
public catalog and registry reads must ignore dormant prices while
`VITE_DIRECT_MARKETPLACE_ENABLED` is false. Profit-share payout onboarding and
distributions are independent of marketplace checkout.

## Architectural goals

Modulora is a creator-first component discovery and distribution platform. It launches with React and expands to Vue and Svelte only after the React ecosystem is proven. The product uses shadcn/ui to build the interface and the shadcn registry protocol as its first install format, while keeping Modulora's trust, commerce, and provenance model independent of any one framework.

The architecture must make these outcomes easy:

1. A creator connects a canonical source repository and publishes an authorized component release.
2. A developer or coding agent discovers a component and installs it with one command.
3. Every release has a stable identity, owner, source, version, license state, and evidence record.
4. Open-source code remains freely viewable and installable.
5. Closed-source listings can point to a creator-controlled purchase flow without Modulora storing the source at launch.
6. The public registry can be self-hosted; Modulora Cloud adds private, commercial, and operational capabilities.
7. Untrusted code never executes in the control plane.

## Product stack

| Layer | Primary choice | Boundary |
|---|---|---|
| Web framework | TanStack Start | Public catalog, creator dashboard, account UI, SSR, browser-facing server functions |
| UI system | shadcn/ui + Tailwind CSS | Modulora's product interface; copied source owned by the project |
| Authentication | Better Auth | Users, sessions, passkeys, MFA, organizations, roles; self-hostable core |
| Registry format | shadcn registry schema | Compatibility layer for item manifests and installation |
| Modulora metadata | Modulora companion manifest | Ownership, provenance, source model, commercial link, trust evidence, signatures |
| Public API | Framework-neutral HTTP API + OpenAPI | CLI, MCP, CI, integrations, and third-party clients |
| Database | PostgreSQL; Neon for development | Transactional product, identity, publishing, and audit metadata; retain compatibility with standard PostgreSQL for self-hosting |
| Object storage | S3-compatible | Immutable release artifacts, screenshots, scan reports, attestations |
| Search | PostgreSQL first | Add a dedicated search service only after measured need |
| Hosting | Cloudflare Workers + Static Assets | TanStack Start SSR and static assets; Pages is not required for the main app |
| Edge API/jobs | Cloudflare Workers + Queues | Public API, asynchronous metadata jobs, indexing, and notifications |
| Artifacts | Cloudflare R2 | Immutable public release artifacts, screenshots, evidence, and scan outputs |
| Jobs | Cloudflare Queues initially; isolated external sandbox later | Metadata jobs can run on Workers; untrusted code execution cannot |

TanStack Start is not the domain layer. Route loaders and server functions call application services; they do not own registry rules. The API, workers, CLI, and web app all consume shared public contracts.

## Repository architecture

The organization uses a hybrid split: a public core monorepo plus separate protocol and CLI repositories.

### Public repositories

| Repository | License | Purpose |
|---|---|---|
| `.github` | CC0/docs as appropriate | Organization profile, contribution defaults, security policy, issue and PR templates |
| `modulora` | AGPL-3.0-only | Self-hostable public catalog, TanStack Start web app, public API, workers, database schema, moderation primitives |
| `spec` | Apache-2.0 | Modulora manifest schemas, provenance model, trust vocabulary, OpenAPI contracts, generated fixtures |
| `cli` | Apache-2.0 | Installer engine and `modulora` CLI: search, info, add, diff, update, verify, login |
| `integrations` | Apache-2.0 | MCP server, SKILL.md adapter, GitHub Action, shadcn import/export adapters; create only when needed |
| `examples` | Apache-2.0 | Reference registries, malicious fixtures, self-host examples, framework examples; create after contracts stabilize |

### Private repositories

| Repository | Purpose |
|---|---|
| `cloud` | Hosted private registries, promotion inventory, billing, commercial entitlements, enterprise workflows, cloud-only composition |
| `infra` | Terraform/Pulumi, production deployment, network policy, observability, secret references, disaster recovery automation |
| `ops` | Internal runbooks, support tooling, abuse operations, incident records; create only when operational volume justifies it |
| `enterprise` | Optional later split for SSO/SCIM, advanced policy, dedicated deployment features; keep in `cloud` until separation is useful |

Closed code may import public packages. Public code must never import private packages. Trust-critical behavior—manifest validation, signature verification, CLI safety checks, evidence semantics, and sponsored-label rules—stays public.

Existing projects such as `jal-co/scn-stack`, `shieldcn`, and `agent-plugin-sdk` remain independent. Integrate through documented adapters; do not transfer unrelated brands merely because they are useful to Modulora.

## Open-core boundary

### Open

- Public component catalog and creator profiles.
- Public publishing from creator-authorized repositories.
- Source ownership verification and release provenance.
- Manifest validation, hashes, signatures, revocation, and trust evidence.
- Baseline secret, dependency, license, and static checks.
- Open-source code display and public install endpoints.
- Safe CLI planning, diffing, verification, installation, and rollback.
- Public moderation states, reporting, takedown workflow, and sponsored labels.
- Self-hostable users, sessions, organizations, and basic roles.
- A reference Node/Docker deployment.

### Closed

- Modulora Cloud billing and subscription management.
- Paid promotion inventory allocation and campaign analytics.
- Private registries and cross-organization grants.
- Commercial checkout, entitlement, and paid-source delivery when introduced.
- Enterprise SSO/SCIM, advanced policy, long-retention audit features, dedicated regions.
- Production infrastructure, fraud controls, internal moderation tooling, and support systems.

A feature is not automatically closed because it is expensive. Public trust semantics remain open; hosted execution, private data, governance, and operations are monetizable.

## Registry model

### shadcn compatibility

Modulora accepts and emits valid shadcn registry items. The shadcn document remains the install payload and can include files, dependencies, registry dependencies, CSS, and declared example environment variables.

Modulora adds a companion manifest rather than inserting proprietary fields into the shadcn schema:

```text
registry-item.json          # shadcn-compatible install payload
modulora-item.json          # ownership, provenance, policy, commerce, evidence
attestation.json            # immutable release digest and signatures
```

### Component source models

| Source model | Listing | Code display | Install behavior |
|---|---|---|---|
| Open source | Public or unlisted | Full source where license permits | Public immutable registry endpoint |
| External commercial | Public metadata | Creator-selected snippets only | Purchase link; creator controls fulfillment |
| Private team | Private | Authorized members only | Short-lived scoped token from Modulora Cloud |
| Hosted commercial | Future | Authorized preview/diff | Entitlement-gated signed delivery; not MVP |

Visibility and source model are separate. A listing may be public while its implementation is commercially distributed elsewhere.

### Trust states

Never display a single ambiguous “Verified” badge. Evidence is separated:

- **Owner verified:** publisher controls the connected identity/repository/domain.
- **Source linked:** release resolves to a canonical repository and commit.
- **Artifact signed:** manifest and files match a valid publisher/platform signature.
- **Scanned:** named scans ran at a stated time against an exact digest.
- **Build checked:** a defined build/typecheck completed in isolation.
- **Human reviewed:** a named review policy was completed.
- **Source not assessed:** required on external commercial listings whose source Modulora cannot inspect.
- **Revoked:** release must not be installed.

Each state links to evidence, scope, timestamp, tool/policy version, and limitations.

## Core services

### Identity and organization service

Better Auth owns login/session primitives. Modulora owns application authorization:

- users, creator profiles, organizations, memberships, invitations;
- roles: owner, admin, publisher, reviewer, analyst, billing;
- namespace and component ownership;
- step-up authorization records;
- recovery and ownership-transfer controls.

Every authorization decision is server-side and scoped to a concrete resource.

### Catalog service

- Components, versions, categories, tags, compatibility, docs, screenshots.
- Source model, visibility, license expression, support and purchase links.
- Search documents and organic ranking signals.
- Sponsored placement is queried separately and visibly composed into results.

### Publishing service

- GitHub App installation and repository selection.
- Explicit release authorization from an allowed publisher.
- Immutable source commit and normalized manifests.
- Version uniqueness, namespace protection, transfer/deprecation/revocation.
- Append-only publishing events.

### Evidence service

- Canonical manifest digest and file-level hashes.
- Scan/build outputs and policy evaluation.
- Signatures, signing identity, key version, revocation state.
- Public evidence document consumed by web, API, and CLI.

### Installation service

- Resolve exact component and version.
- Return signed manifests and evidence.
- Generate an install plan; never arbitrary shell commands from creator metadata.
- Public install metrics are privacy-preserving and resistant to simple replay inflation.

### Link and commerce metadata service

Launch scope:

- Creator purchase URL and its scoped domain-verification status.
- URL reputation/availability checks and redirect monitoring.
- Price label supplied by creator and timestamped as creator-provided.
- No claim that Modulora verified unseen commercial source.

Future hosted commerce is a separate security and legal program, not an incremental toggle.

## Key data entities

```text
User ──< Membership >── Organization
Organization ──< Namespace ──< Component ──< ComponentVersion
ComponentVersion ──1 SourceReference
ComponentVersion ──1 InstallManifest
ComponentVersion ──1 ProvenanceAttestation
ComponentVersion ──< EvidenceResult
ComponentVersion ──< Artifact
Component ──< PurchaseLink
Component ──< PromotionCampaign
User/Organization/Component/Version ──< AuditEvent
ComponentVersion ──< Report ──< ModerationDecision
```

Important invariants:

- A version is immutable after publication.
- Every version belongs to one component and one authorized owner at publish time.
- Ownership transfers do not rewrite historical attestations.
- Revocation adds state; it never deletes the historical record.
- Promotion never changes organic rank or evidence state.
- External commercial listings never receive source-safety claims without source access.

## Creator workflow

1. Create a free profile using Better Auth.
2. Add a passkey or MFA before gaining publish permission.
3. Connect the least-privilege Modulora GitHub App.
4. Select a repository and prove namespace ownership.
5. Import a shadcn registry item or use the publishing CLI.
6. Choose open-source or external-commercial source model.
7. Supply license/source or purchase-domain metadata, including whether domain control was verified.
8. Review normalized files, dependencies, targets, and generated install behavior.
9. Explicitly authorize an immutable release.
10. Modulora validates, scans, signs/attests, and publishes evidence.
11. Creator can deprecate or request revocation; cannot mutate the release.

## Developer and agent workflow

1. Search by job, category, compatibility, creator, license, or trust evidence.
2. Open a listing with preview, support status, dependencies, and evidence.
3. For open source, copy `modulora add @creator/item@version` or pass it to an agent.
4. CLI fetches the signed manifest, verifies it, and produces a plan/diff.
5. User or configured policy approves writes.
6. Installer applies changes atomically and writes `modulora.lock`.
7. For external commercial items, the user follows a clearly marked creator purchase link; Modulora does not imply delivery or source assessment.

MCP discovery is read-only at launch. Agents may produce an installation plan, but code writes go through the same CLI policy and approval path as humans.

## CLI contract

```bash
modulora search "accessible date picker"
modulora info @creator/calendar
modulora add @creator/calendar@1.2.0 --dry-run
modulora diff @creator/calendar@1.2.0
modulora add @creator/calendar@1.2.0
modulora verify
modulora update @creator/calendar --dry-run
```

The CLI must:

- verify signatures and hashes before writes;
- reject absolute paths, traversal, symlink escapes, unsafe targets, and lifecycle scripts;
- show files, dependency changes, config changes, environment placeholders, warnings, and license obligations;
- default to immutable versions, atomic writes, backups, and rollback;
- distinguish Modulora evidence from creator claims;
- never place long-lived credentials in commands or query strings.

## Development database

Use the Neon project `steep-resonance-36850182` for shared development environments. Configuration must use environment variables; credentials and connection strings must never be committed.

- Keep migrations provider-neutral and compatible with standard PostgreSQL.
- Use separate Neon branches or databases for development, preview, and automated tests rather than sharing mutable state.
- Require TLS and pooled connections for application traffic; use a direct connection only where the migration tool requires it.
- Apply least-privilege database roles for web/API, workers, and migrations.
- Do not treat the Neon console URL as a database credential.
- Production database hosting remains an explicit later decision.

## Cloudflare deployment

Use Cloudflare Workers as the primary deployment target. The TanStack Start app ships as a Worker with Static Assets, matching Cloudflare's documented deployment model (`.output/server/index.mjs`, `.output/public`, and `nodejs_compat`). Do not split the main application between Pages and Workers.

Proposed services:

| Service | Host | Responsibility |
|---|---|---|
| `modulora-web` | Worker + Static Assets | TanStack Start SSR, public pages, dashboard, Better Auth browser flows |
| `modulora-api` | Worker | Public CLI/MCP/API endpoints, rate limits, signed metadata delivery |
| `modulora-jobs` | Queue consumer Worker | Ingestion orchestration, indexing, notifications, non-executing scans |
| `modulora-artifacts` | R2 | Immutable manifests, attestations, screenshots, public scan reports |
| Development PostgreSQL | Neon through Hyperdrive | Shared dev data; Neon branches for previews/tests |
| Preview/build sandbox | Separate hardened platform/account | Untrusted dependency installation and code execution; never a normal Worker job |

The web and API may begin in one Worker if that materially speeds the first vertical slice, but their package and authorization boundaries remain separate so the API can split without a rewrite. Use service bindings for Worker-to-Worker calls rather than public HTTP where appropriate.

Cloudflare Pages remains an optional choice for a future purely static property. It is not part of the baseline architecture.

For Neon, Cloudflare recommends Hyperdrive and supports the Neon serverless driver as an alternative. Use Hyperdrive for deployed Workers, `nodejs_compat`, separate least-privilege database roles, and a direct Neon connection only for migrations where required.

Cloudflare Queues provide delivery/retry support and dead-letter queues, but consumers must still be idempotent. R2 stores artifacts; the database stores their metadata and digests.

## Deployment topology

```text
Browser / CLI / MCP
        |
Cloudflare edge + rate limits
        |
  Web Worker + Assets ---- API Worker
        |                       |
        +------ Domain services +------ PostgreSQL
                                +------ Object storage
                                +------ Queue
                                           |
                                     Isolated workers
                                (ingest / scan / render)
```

Preview content is served from a separate origin. Worker networks cannot reach the control plane, production database, metadata services, or internal networks. Public API and web sessions use separate credentials and scopes.

## Decisions deliberately deferred

- Vue and Svelte publishing and install adapters.
- Automatic cross-framework conversion.
- AI component generation.
- Hosted paid-source storage and delivery.
- Creator checkout, payouts, tax, refunds, and marketplace custody.
- Write-capable MCP tools.
- Automatic background updates.
- Arbitrary install scripts.
- Real-time collaboration and a visual component editor.

## Architecture acceptance criteria

The architecture is ready for implementation only when:

- public/private dependency direction is enforced in CI;
- the shadcn companion manifest and evidence vocabulary have versioned schemas;
- a full data-flow and threat model is reviewed;
- authorization rules have a resource/role matrix;
- malicious registry fixtures test installer and parser boundaries;
- the sandbox design passes independent review before executing third-party code;
- self-hosting works from documented Node/Docker instructions without cloud-private packages.
