# Modulora Security Model

> Status: threat-model baseline · Updated: 2026-07-11

Modulora is part marketplace, package registry, identity system, and software supply chain. Security is a product requirement, not a badge added after launch. This document defines the minimum posture for creator accounts, component releases, installation, external commercial listings, and platform operations.

## Security objectives

1. Only authorized creators can publish or change a component listing.
2. Users can determine exactly what identity and evidence apply to an immutable release.
3. A compromised creator, dependency, worker, or integration cannot silently compromise the platform.
4. Registry payloads cannot write outside approved project boundaries or execute arbitrary install behavior.
5. Untrusted code cannot reach production data, credentials, control-plane services, or internal networks.
6. Compromise can be detected, contained, revoked, investigated, and communicated.
7. External commercial listings never receive claims Modulora cannot substantiate.

## Assets

### Critical

- Creator and organization ownership.
- Publishing authority and release history.
- Better Auth sessions, passkeys, MFA factors, recovery methods.
- GitHub App private keys and installation tokens.
- Artifact signing keys and revocation state.
- Production database, object storage, queues, and cloud credentials.
- Private component source when hosted delivery is introduced.

### High value

- Component names and namespaces.
- Provenance attestations and security evidence.
- Audit logs and moderation records.
- Purchase links, promotion campaigns, billing and payout data.
- Search ranking and install analytics.

## Actors and likely threats

| Actor | Goal |
|---|---|
| Account attacker | Take over a creator, administrator, or organization and publish malicious updates |
| Malicious publisher | Distribute credential stealers, destructive code, dependency attacks, or misleading listings |
| Supply-chain attacker | Compromise dependencies, CI, npm publishing, GitHub Apps, or signing infrastructure |
| Sandbox attacker | Escape preview/build isolation and reach cloud resources or other tenants |
| Marketplace abuser | Typosquat, impersonate brands, inflate installs, manipulate reviews/analytics, or redirect purchases |
| Insider or support attacker | Abuse administrative access, change ownership, suppress reports, or access private data |
| Scraper/reseller | Republish creator work, harvest paid previews, or violate license terms |
| Competitor or botnet | Exhaust build capacity, search/API quotas, or moderation operations |

## Trust boundaries

```text
Untrusted internet
  ├─ browser content, uploads, metadata, URLs, reports
  ├─ registry files and dependency manifests
  └─ GitHub webhook events
          |
Edge boundary: TLS, WAF/rate limits, request validation
          |
Control plane: identity, catalog, publishing, authorization
          |
Queue boundary: signed job descriptions, no credentials in payloads
          |
Worker boundary: ephemeral isolated execution, no control-plane network
          |
Artifact boundary: immutable storage, digest/signature verification
          |
Client boundary: CLI verifies before atomic local writes
```

## Account security

Better Auth is the authentication foundation, not the authorization policy by itself.

### Required before public publishing

- Passkey or phishing-resistant MFA for every publisher and platform administrator.
- Verified email; verified domain for organization identity claims.
- Secure, HttpOnly, SameSite cookies and session rotation after authentication and privilege changes.
- Session/device inventory with individual and global revocation.
- Step-up authentication for publish, ownership transfer, namespace transfer, visibility changes, recovery changes, billing, API-key creation, and destructive actions.
- Login, recovery, ownership-transfer, and new-publisher notifications.
- Rate limits and abuse detection on login, recovery, invitation, and token endpoints.
- OAuth account linking requires an authenticated session and reauthentication; matching email alone is insufficient.

### Recovery

Recovery is a common account-takeover path:

- Recovery codes are one-time, hashed at rest, and regenerated only after step-up authentication.
- Sensitive recovery changes trigger a cooldown before publishing or ownership transfer.
- Existing sessions and factors are notified; high-risk changes can revoke other sessions.
- Organization ownership recovery requires dual evidence and human review; support cannot instantly bypass it.
- Administrators use separate privileged accounts and hardware-backed MFA.

### Authorization model

Roles are explicit and resource-scoped:

| Action | Owner | Admin | Publisher | Reviewer | Analyst | Billing |
|---|---:|---:|---:|---:|---:|---:|
| Manage members | Yes | Yes | No | No | No | No |
| Transfer namespace/org | Dual approval | No | No | No | No | No |
| Create draft | Yes | Yes | Yes | No | No | No |
| Publish release | Yes | Yes | Yes with MFA | Optional approval | No | No |
| Revoke release | Yes | Yes | No | Recommend | No | No |
| View analytics | Yes | Yes | Optional | Optional | Yes | No |
| Manage billing | Yes | Optional | No | No | No | Yes |

Every request rechecks membership, role, resource ownership, and organization state server-side. UI visibility is never authorization.

## GitHub integration security

Use a GitHub App, not broad personal access tokens.

- Request only repository metadata and content permissions needed for selected repositories.
- Installation tokens are short-lived, generated server-side, and never sent to the browser or worker.
- Verify webhook signatures using the raw request body; enforce timestamp/replay controls and idempotency.
- Reconcile installation/repository permissions periodically rather than trusting webhook delivery alone.
- Detect repository transfer, deletion, default-branch change, revoked installation, and namespace ownership changes.
- Publishing requires explicit authorization against an immutable commit; a webhook alone cannot publish.
- GitHub App private keys live in a managed secrets/KMS system, rotate regularly, and have a compromise runbook.

## Component publishing security

### Ingestion

All creator-controlled inputs are untrusted:

- Parse strict JSON with depth, size, item-count, and string-length limits.
- Reject unknown high-impact fields in strict mode.
- Normalize Unicode names and detect confusable/typosquatted namespaces.
- Reject absolute paths, `..`, null bytes, device paths, symlink/hardlink escapes, and case-collision attacks.
- Restrict allowed shadcn item types and destination roots.
- Reject arbitrary shell commands and package lifecycle scripts.
- Treat `envVars` as named placeholders only; scan values and files for secrets.
- Sanitize Markdown/HTML; prohibit active SVG and proxy untrusted images.

### Release integrity

A published version is immutable and includes:

- normalized shadcn manifest;
- Modulora companion manifest;
- file-level SHA-256 or stronger digests;
- exact source repository and commit;
- dependency and registry-dependency set;
- evidence records and policy versions;
- canonical release digest;
- publisher authorization and platform attestation.

Changing any field produces a new version. Deprecation and revocation append state rather than rewriting history.

### Signing and keys

- Define canonical serialization before implementing signatures.
- Platform signing keys live in KMS/HSM-backed custody and are never available to web or worker processes.
- Record key identifier, algorithm, signature time, and transparency-log reference.
- Support rotation, revocation, compromised-key cutoff times, and client trust-store updates.
- The CLI fails closed for invalid, unknown, revoked, or mismatched signatures.
- Hashes prove integrity; signatures connect integrity to an identity. Never conflate them.

## Evidence, not badges

Never use one generic “secure” or “verified” label. Show independent evidence:

| Evidence | What it proves | What it does not prove |
|---|---|---|
| Owner verified | Control of an identity/repository/domain at a point in time | Code safety or legal ownership of every line |
| Artifact signed | Artifact matches a signer-authorized digest | Absence of malicious behavior |
| Secret scan passed | Named scanner found no matched secret at scan time | No unknown or obfuscated secret exists |
| Dependency scan passed | No matched advisory/policy violation at scan time | Future vulnerability absence |
| Build checked | Defined command completed in an isolated environment | Correctness or safety |
| Human reviewed | A stated review policy was performed | Permanent security |

Evidence pages include digest, version, timestamps, scanner versions, limitations, and superseding/revoked state.

External commercial listings must display **Source not assessed by Modulora** unless the creator grants review access under a defined program.

## Worker and preview isolation

No arbitrary component execution ships before an independent sandbox review.

### Minimum worker controls

- Ephemeral single-job isolation using hardened microVMs or equivalent—not process-only containers.
- Dedicated cloud account/project and network separate from the control plane.
- No production credentials, instance metadata access, host sockets, or shared writable volumes.
- Unprivileged user, read-only base image, ephemeral filesystem, syscall/capability restrictions.
- CPU, memory, process, disk, output, and wall-clock limits.
- Network denied by default. Dependency access only through a controlled, logged proxy/cache with policy enforcement.
- Job input and output transferred through narrowly scoped object-storage grants.
- Worker images are pinned, signed, scanned, patched, and rapidly revocable.
- Sandbox escape detection, kill switch, forensic logging, and incident response.

### Preview delivery

- Previews run on a separate origin with no shared cookies.
- Sandboxed iframes use the minimum capabilities.
- Strict CSP, no top navigation, no opener access, no arbitrary downloads.
- External network access is blocked or explicitly declared and proxied.
- Screenshots are preferred for untrusted or external commercial components until live-preview safety is established.

## CLI and installation security

The CLI is a security boundary and must be independently threat-modeled.

### Required behavior

1. Resolve an exact immutable version.
2. Fetch the manifest, attestation, and evidence over TLS.
3. Verify signature, digest, revocation, and namespace.
4. Produce a dry-run plan listing every file and dependency/config change.
5. Enforce safe roots and reject traversal, symlink, case-collision, and overwrite attacks.
6. Require explicit approval for dependency installation and high-impact config files.
7. Stage changes in a temporary directory.
8. Apply atomically, save a rollback record, and write `modulora.lock`.
9. Never execute creator-supplied commands or install hooks.
10. Never embed long-lived tokens in commands, logs, shell history, or query strings.

### CLI supply chain

- Publish from protected GitHub environments using npm trusted publishing/OIDC and provenance where available.
- No long-lived npm publish token.
- Mandatory review and signed/protected release tags.
- Reproducible build target and public checksums.
- Malicious-registry fixtures, fuzz/property tests, and path/symlink tests block release.

## External commercial listing security

Launch behavior deliberately avoids paid-source custody.

- Verify the creator controls the destination domain.
- Display the final destination domain before navigation.
- Prevent open redirects and continuously monitor redirects/domain ownership changes.
- Scan links for malware/phishing signals and provide reporting/takedown.
- Mark price and commercial terms as creator-provided with a last-checked timestamp.
- Do not display install commands that imply Modulora delivery.
- Do not claim the unseen source was scanned, reviewed, or signed by Modulora.
- Creator-hosted demos remain untrusted and open in an isolated/new context.

Hosted commercial delivery later requires a separate review covering encryption, entitlement tokens, payment security, seller identity/tax, refunds, leakage, abuse, and the reality that source code cannot be durable DRM after installation.

## Marketplace and creator abuse

- Protected namespace list and similarity/confusable detection.
- Verified organization/domain indicators based on evidence, not payment.
- Ownership transfers require dual approval, step-up auth, notifications, and cooldown.
- No unclaimed mirrors at launch.
- Rate limits and review queues for new or risky publishers.
- Install and click analytics deduplicate obvious replay/bot traffic.
- Sponsored placement is queried and rendered separately from organic results.
- Paid promotion cannot change evidence state, organic score, moderation priority, or eligibility policy.
- Trademark, copyright, impersonation, malware, and license complaint workflows have published SLAs.

## Data protection

- Data classification: public, internal, confidential, restricted.
- Minimize personal data and public install telemetry.
- Encrypt data in transit and at rest; use field-level protection for recovery, tokens, and future payment/payout data where appropriate.
- Secrets live in a managed secret store, not repository files or general environment dumps.
- Audit access to restricted data and private artifacts.
- Retention and deletion policies distinguish user data from immutable public security history.
- Backups are encrypted, access-controlled, restored in tests, and covered by deletion policy.

## Logging and audit

Security-relevant events are immutable or tamper-evident:

- authentication, MFA, recovery, session and API-token events;
- membership/role/invitation changes;
- namespace and ownership changes;
- drafts, release authorization, publish, deprecate, revoke;
- signing and key events;
- scan/policy outcomes;
- administrative access and moderation decisions;
- promotion eligibility and placement decisions;
- private artifact and entitlement access when introduced.

Logs never include credentials, full tokens, component private source, or sensitive request bodies.

## Security release gates

### Gate 1: architecture

- Reviewed data-flow diagram, threat model, data classification, and named security owner.
- Public/private dependency direction enforced.
- Security requirements traced to tests.

### Gate 2: accounts

- ASVS-aligned auth/session review.
- Publisher/admin passkey or MFA and step-up flows operational.
- Recovery, account linking, session revocation, authorization, and rate-limit tests pass.

### Gate 3: publisher integration

- Least-privilege GitHub App, signed/replay-protected webhooks, release authorization, transfer detection, and audit trail.

### Gate 4: artifacts

- Immutable versions, strict manifests, signatures, hashes, SBOM/dependency/license/secret scans, and revocation path.

### Gate 5: CLI

- Malicious fixtures, path/symlink tests, signature failures, atomic rollback, and secure npm publishing independently reviewed.

### Gate 6: execution

- Independent sandbox penetration review before any third-party code is built or rendered.

### Gate 7: operations

- Incident response, signing-key compromise, account takeover, malicious release, takedown, backup/restore, and secret-rotation exercises.

### Gate 8: commercial custody

- Legal, payment, entitlement, fraud, encryption/key, leakage, refund, and support review before hosted commercial source or payouts.

## Must not ship in MVP

- Unclaimed mirrored listings.
- One broad “verified” or “secure” badge.
- Security claims for unseen closed source.
- Hosted paid-source storage/delivery.
- Creator payouts or marketplace custody.
- Arbitrary lifecycle/install scripts.
- Automatic/background component updates.
- Write-capable MCP installation.
- Long-lived install/download tokens.
- Query-string secrets.
- Arbitrary code previews before sandbox approval.
- Support impersonation without approval, audit, and user notification.

## Incident priorities

1. Stop further installs: revoke release/signing key and update client deny data.
2. Preserve evidence: immutable logs, artifacts, job records, and affected digests.
3. Notify affected creators/installers with exact versions and remediation.
4. Rotate exposed credentials and invalidate sessions/tokens.
5. Publish a factual incident record and root-cause/remediation timeline where appropriate.
6. Update fixtures, policies, and tests before restoring the affected capability.

## Security references

- [OWASP Software Supply Chain Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [GitHub App private-key management](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps)
- [Better Auth plugins](https://better-auth.com/docs/plugins)
- [Better Auth 2FA](https://better-auth.com/docs/plugins/2fa)
- [Better Auth organizations](https://better-auth.com/docs/plugins/organization)
