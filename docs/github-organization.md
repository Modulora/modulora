# Modulora GitHub Organization

> Status: proposed · Updated: 2026-07-11

The `Modulora` GitHub organization exists and `jal-co` is an active administrator. It currently has no repositories. The first transfer should be `jal-co/modulora` after the license and repository purpose are finalized.

## Repository map

### Create or transfer now

| Repository | Visibility | License | Purpose |
|---|---|---|---|
| `.github` | Public | CC0-1.0 for templates/docs where appropriate | Organization profile, contribution defaults, security policy, support links, issue and PR templates |
| `modulora` | Public | AGPL-3.0-only | Self-hostable catalog, web app, public API, workers, database schema, moderation and trust logic |
| `spec` | Public | Apache-2.0 | Companion manifest, evidence vocabulary, schemas, OpenAPI, conformance fixtures |
| `cli` | Public | Apache-2.0 | Installer engine and CLI |
| `cloud` | Private | Proprietary | Modulora Cloud composition, private registry, billing, promotion, enterprise features |
| `infra` | Private | Proprietary/internal | Production infrastructure and deployment automation |

Do not create empty `integrations`, `examples`, `enterprise`, or `ops` repositories until work exists that needs a separate lifecycle.

### Create later

| Repository | Visibility | Trigger |
|---|---|---|
| `integrations` | Public | MCP, GitHub Action, skills, and adapters need releases independent of CLI/core |
| `examples` | Public | Schemas and CLI stabilize enough for reference registries/self-host deployments |
| `enterprise` | Private | Enterprise features need independent ownership/release cadence from cloud |
| `ops` | Private | Support, moderation, and incident operations outgrow documentation in cloud/infra |
| `website` | Avoid initially | Marketing/docs should live in the public core unless deployment/release needs diverge |

## Transfer sequence

1. Finalize licenses and contribution policy while Justin is the sole contributor.
2. Create `.github` and publish the organization profile/security contact.
3. Transfer `jal-co/modulora` to `Modulora/modulora`.
4. Update local remote, package metadata, badges, domains, webhook/App settings, and documentation links.
5. Create `spec` before accepting schema contributions.
6. Create `cli` when the installer implementation begins.
7. Create private `cloud` and `infra` only when cloud work starts.
8. Verify GitHub redirects, branch protections, Actions permissions, package ownership, and npm trusted publishing after every transfer.

## Organization access

### Owners

- Keep the owner group extremely small.
- Require hardware-backed passkeys or security keys and two-factor authentication.
- Use a separate recovery path and maintain at least two trustworthy owners before production.
- Owners do not use broad personal tokens for automation.

### Teams

| Team | Access |
|---|---|
| `maintainers` | Maintain/admin public repositories as needed; no automatic private infrastructure access |
| `core` | Write to `modulora`; review domain/API/db changes |
| `spec` | Write to `spec`; own compatibility and evidence vocabulary |
| `cli` | Write to `cli`; own installer and release security |
| `security` | Triage private advisories across repositories; review trust/auth/sandbox changes |
| `cloud` | Access private `cloud`; read public repositories |
| `infra` | Access private `infra`; production deployment permissions through protected environments |
| `moderation` | Product moderation tooling/data only; no code or infrastructure privilege by default |

Grant access through teams, not directly to individuals, except emergency temporary access with an audit record.

## Repository protections

Apply to every default branch:

- No direct pushes.
- Pull request required.
- At least one approval; two for security, auth, signing, installer, sandbox, licensing, or infrastructure changes.
- Dismiss stale approvals after changes.
- Require approval from CODEOWNERS.
- Require signed commits where practical or verified GitHub merge identity.
- Require linear/squash history for feature branches.
- Require tests, typecheck, lint, license checks, secret scanning, and dependency review.
- Block force pushes and branch deletion.
- Enable private vulnerability reporting and security advisories.
- Enable Dependabot/Renovate with grouped, reviewed updates; never auto-merge security-boundary dependencies without tests.

Release tags are protected. Publishing uses GitHub environments with required reviewers and trusted/OIDC publishing.

## CODEOWNERS boundaries

Example for `modulora`:

```text
/apps/web/                 @Modulora/core
/apps/api/                 @Modulora/core @Modulora/security
/apps/worker/              @Modulora/core @Modulora/security
/packages/domain/          @Modulora/core
/packages/db/              @Modulora/core
/packages/auth/            @Modulora/security @Modulora/core
/packages/evidence/        @Modulora/security @Modulora/spec
/packages/moderation/      @Modulora/core @Modulora/security
/.github/workflows/        @Modulora/security @Modulora/maintainers
/LICENSES/                 @Modulora/maintainers
```

Example for `cli`:

```text
/src/install/              @Modulora/cli @Modulora/security
/src/verify/               @Modulora/cli @Modulora/security
/src/auth/                 @Modulora/cli @Modulora/security
/.github/workflows/        @Modulora/security @Modulora/maintainers
```

## GitHub Actions policy

- Default `GITHUB_TOKEN` permissions to read-only.
- Set explicit minimal permissions per job.
- Pin third-party actions to full commit SHAs.
- Separate untrusted PR tests from privileged release/deployment workflows.
- Never expose secrets to fork pull requests.
- Use OIDC for cloud and npm publishing; avoid long-lived credentials.
- Protect production and package-publish environments with reviewers.
- Generate and retain provenance/SBOM for releases.
- Run secret scanning and high-signal custom patterns across source, history where appropriate, and build artifacts.
- Treat workflow changes as security-sensitive CODEOWNERS paths.

## Secrets and keys

GitHub is not the primary production secret store.

- Keep only narrowly scoped bootstrap/OIDC configuration in GitHub.
- Store production secrets, GitHub App keys, and signing keys in managed secret/KMS systems.
- Never place component private source or customer data in Actions artifacts/logs.
- Rotate credentials and invalidate old versions through documented runbooks.
- Use separate identities for CI, deployment, signing, and runtime.

## Issues, discussions, and security reports

### Public

- Bug reports, feature requests, RFCs, roadmap discussions, contribution help.
- Moderation and takedown policy questions without sensitive claimant data.
- Public incident summaries when appropriate.

### Private

- Vulnerability reports through GitHub private reporting/security advisories.
- Active abuse investigations and personal claimant information.
- Customer/private registry incidents.
- Signing-key, credential, infrastructure, fraud, or payment investigations.

The public issue tracker must never be used to report an exploitable vulnerability or expose private component source.

## Package namespaces

Preferred package layout:

```text
modulora                   # CLI binary if exact name is secured
@modulora/spec             # schemas and types
@modulora/api-client       # public API client
@modulora/installer        # reusable installer engine
@modulora/mcp              # later integration
```

Secure npm ownership with organization MFA, minimal maintainers, trusted publishing, provenance, protected release environments, and a documented package-compromise response.

## Public/private dependency rule

```text
spec  <── cli
  ▲        ▲
  │        │
public core ────────< cloud <── enterprise
  ▲                    ▲
  └──── integrations   └── infra deploys, never imports application code
```

- Public repositories cannot depend on private packages, private registries, or unpublished schemas.
- `cloud` may compose and extend public services through published interfaces.
- `infra` deploys artifacts; application packages do not import infrastructure code.
- Trust-critical behavior cannot be overridden privately without a public, visible contract.

## Existing jal-co projects

- `jal-co/scn-stack`: keep independent; it can generate or integrate Modulora-compatible registries later.
- `jal-co/shieldcn`: keep independent; Modulora may use it for README/status assets.
- `jal-co/agent-plugin-sdk`: keep independent; a Modulora agent adapter may consume it.

Do not move them into the organization unless their product identity, governance, and roadmap become explicitly part of Modulora.

## Organization launch checklist

- [ ] Trademark/domain decision is sufficiently cleared.
- [ ] Organization owners have hardware-backed MFA and recovery plan.
- [ ] `.github` profile and `SECURITY.md` are public.
- [ ] Licenses and contribution mechanism are reviewed.
- [ ] `jal-co/modulora` transfer is complete.
- [ ] Branch/ruleset and CODEOWNERS protections are active.
- [ ] Actions default permissions are read-only.
- [ ] Private vulnerability reporting is enabled.
- [ ] npm organization/package ownership is secured.
- [ ] GitHub App is owned by Modulora and uses least privilege.
- [ ] Public/private dependency checks run in CI.
- [ ] Production secrets and signing keys live outside GitHub.
