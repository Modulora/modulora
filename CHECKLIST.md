# Modulora Core Checklist

## Governance and licensing

- [ ] Complete trademark and domain review.
- [ ] Finalize AGPL-3.0 core and Apache-2.0 spec/CLI licensing with counsel.
- [ ] Choose DCO or contributor agreement.
- [ ] Add CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, and component publishing terms.
- [ ] Configure CODEOWNERS and protected branch rules.
- [ ] Enable private vulnerability reporting.

## Foundation

- [ ] Scaffold TanStack Start with Cloudflare Vite integration.
- [ ] Build the product interface with shadcn/ui.
- [ ] Add Better Auth with passkeys, MFA, sessions, organizations, and roles.
- [ ] Configure Neon development PostgreSQL through environment variables.
- [ ] Add migration tooling and separate app/worker/migration roles.
- [ ] Configure Cloudflare Workers, Static Assets, Queues, R2, and Hyperdrive.
- [ ] Add CI for lint, typecheck, tests, license checks, and secret scanning.

## First vertical slice

- [ ] Free creator profile and organization namespace.
- [ ] Least-privilege GitHub App connection.
- [ ] Import one creator-authorized shadcn registry item from an exact commit.
- [ ] Publish a public component page with creator, screenshot, source model, license, and compatibility.
- [ ] Search the authorized catalog.
- [ ] Support open-source and external-commercial listing states.
- [ ] Verify and monitor external purchase domains.
- [ ] Add report, takedown, deprecation, and revocation workflows.
- [ ] Keep previews screenshot-only until the sandbox security gate passes.

## Trust and security gates

- [ ] Review data flows and threat model.
- [ ] Require publisher/admin MFA and sensitive-action step-up authentication.
- [ ] Separate owner, source, signature, scan, build, and human-review evidence.
- [ ] Implement immutable releases and append-only history.
- [ ] Add strict manifest/path/target validation and malicious fixtures.
- [ ] Design KMS-backed artifact signing and key revocation.
- [ ] Complete an independent CLI review before install writes.
- [ ] Complete an independent sandbox review before executing creator code.

## Launch evidence

- [ ] Recruit 10 creator design partners.
- [ ] Identify 200 authorized launch components.
- [ ] Recruit five private-registry design partners.
- [ ] Validate search-to-detail and detail-to-install intent.
- [ ] Publish only after ownership, moderation, and incident processes are operational.
