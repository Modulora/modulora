# Modulora Research and Decision History

> Historical research and evolving decisions from the initial concept phase. Current guidance lives in `product-strategy.md`, `architecture.md`, `security.md`, `roadmap.md`, `brand.md`, and `github-organization.md`. Earlier working-name references are intentionally preserved as decision history.

> One-liner: The provenance-first open registry where component authors publish once, developers install trusted components through a universal CLI, and coding agents can explain exactly where every file came from.
> Slug: `open-component-registry` · Started: 2026-07-11

This document accumulates validation and strategy for the project. `Authored` is a working name, not a final trademark clearance.

---

## Triage — 2026-07-11

**Idea:** An open-source registry and universal installation CLI for React component authors, app developers, and AI coding agents, monetized through component promotion and hosted private registries, with an optional creator marketplace later. Vue and Svelte are planned expansion ecosystems after the React product is established.

| # | Axis | Score | Why |
|---|---|---:|---|
| 1 | Problem severity | 4/5 | Discovery is fragmented, provenance is weak, and private component distribution still requires teams to assemble auth, hosting, search, and agent tooling. |
| 2 | Market size / niche | 4/5 | 21st.dev claims a large developer audience, component distribution spans several frameworks, shadcn supports arbitrary code registries, and multiple new registries/marketplaces signal active demand. |
| 3 | Competition intensity | 3/5 | The category is crowded, but no researched product clearly owns verifiable authorship, license safety, and agent-readable provenance together. |
| 4 | Differentiation / moat | 3/5 | Trust metadata is a real wedge, but it is copyable until backed by creator relationships, moderation history, installation data, and a reputation graph. |
| 5 | Willingness-to-pay | 4/5 | 21st.dev charges for heavy usage and AI credits; Stow sells component access; private registries map to existing team software budgets. |
| 6 | Distribution & GTM | 3/5 | The shadcn CLI, GitHub registries, MCP, and author communities are reachable channels, but incumbents already have catalogs and attention. |
| 7 | Founder-fit / advantage | 4/5 | Justin already has `scn-stack`, relevant registry tooling, and direct familiarity with the ecosystem; audience reach is not yet proven. |
| 8 | Name & domain availability | 4/5 | `Authored` is clear and `authoredui.com` appears available, though final registrar and trademark checks remain. |

**Composite:** 3.63/5 (simple average)

**Verdict:** **SHAPE.** The opportunity is credible, but “an open-source 21st.dev” is not enough: addcn, R-HUB, shopcn, Stow, and 21st.dev itself already cover large parts of that description. The product becomes worth shipping when it is narrowly defined as the neutral trust and distribution layer for human- and agent-installed UI code.

**Biggest reason:** provenance, licensing, and author control are structurally important in an agent-driven copy/install ecosystem and remain poorly owned.

**Biggest risk:** building a beautiful empty marketplace while authors and developers continue publishing and installing directly from GitHub.

**What would move this to SHIP:** recruit 10 respected component authors, ingest 200 authorized components, and get 5 teams to commit to a paid private-registry pilot before building marketplace payouts.

---

## Market Reality — 2026-07-11

### What is verified

- 21st.dev is not effectively dead by observable product activity. It announced an $8/month membership on June 23, 2026, while retaining two free component copies per day, and published private-registry tooling in May/June 2026. Competing on “they are dead” is therefore a dangerous premise.
- 21st.dev's open-source `@21st-dev/registry` CLI supports public, unlisted, and private items, teams, semantic search, and coding-agent use through `SKILL.md`.
- The official shadcn registry is now a general code-distribution protocol, not merely a React component feed. It supports custom registries, namespaces, authentication, and public GitHub repositories.
- Competitors validate separate pieces of the opportunity:
  - **addcn**: multi-user public/private shadcn registries with organizations and live previews.
  - **R-HUB**: private/public registry composition with MCP access.
  - **Stow**: multi-framework marketplace with creator selling and token pricing.
  - **shopcn**: open-source, self-hosted marketplace infrastructure with bring-your-own Stripe.
  - **registry.directory and related MCP tools**: cross-registry discovery for agents.
- No credible source was found substantiating the specific claim that 21st.dev steals components. Do not repeat that allegation in marketing, fundraising, docs, or community outreach without documented first-party evidence.

### The open lane

The lane is not “more components.” It is **trusted component supply chain infrastructure**:

1. Who authored this exact code?
2. Did the author authorize this listing?
3. What license governs the component and every included asset?
4. Was the installed code altered after verification?
5. Can a human or agent inspect the answer before installation?
6. Can an author correct, transfer, deprecate, or remove a listing?

That trust layer can span GitHub-hosted registries instead of requiring every author to upload code into a centralized silo.

---

## Positioning — 2026-07-11

### Beachhead

Independent React component authors, plus developers and agents trying to discover and safely install their work. Existing shadcn registry authors are a useful launch cohort, but Authored supports React components regardless of whether they use shadcn, Radix, Base UI, React Aria, Tailwind, CSS Modules, or another styling and primitive stack.

### Core job

**Publish from the canonical source and install with proof.** Authored should index rather than appropriate: the creator's repository remains canonical, while Authored adds verified identity, signed manifests, license metadata, previews, compatibility data, quality checks, search, and installation telemetry. Developers install through the Authored CLI regardless of the source registry format.

### Positioning statement

> Authored is the open component registry that credits the creator, verifies the source, and gives humans and coding agents a safe install path.

### “Only we…” statement

> Only Authored makes provenance a required, machine-readable part of every component installation—not a courtesy link added after publication.

### Principles

- **Canonical source stays with the author.** Prefer Git-backed ingestion and signed releases over opaque copy-and-paste uploads.
- **No orphan listings.** Every public item has a verified maintainer or is visibly labeled “unclaimed mirror.” Unclaimed mirrors should not be monetizable or featured.
- **Attribution travels with the code.** Generated registry payloads include author, source commit, license, notices, and content hashes.
- **Open protocol, replaceable host.** The manifest/schema, verifier, CLI, and agent integrations must work against self-hosted instances.
- **React-first, not shadcn-bound.** The canonical manifest describes source files, React compatibility, dependencies, styling requirements, transforms, and install targets. shadcn, npm, and GitHub registries are adapters around that model. The schema should remain extensible enough to add Vue and Svelte later without burdening the React MVP.
- **Search is not permission.** Publicly accessible code is not automatically eligible for republishing, previewing, AI training, or sale.
- **Removal and disputes are product features.** Provide fast author claims, takedowns, forks/derivation records, and an auditable resolution process.

---

## Product Plan — 2026-07-11

### MVP: prove the trust wedge (6–8 weeks)

Build only what is needed to recruit authors and make trusted installs possible.

1. **GitHub-native publishing**
   - Connect a public repository containing `registry.json`.
   - Verify repository ownership through GitHub OAuth or a committed challenge file.
   - Build immutable releases from a commit SHA; never silently mutate a published version.
2. **Provenance manifest**
   - Author identity and canonical repository.
   - Source commit, file-level SHA-256 hashes, build tool version, timestamps.
   - SPDX license identifier plus required notice files and asset licenses.
   - Declared upstream inspirations/derivations and dependency graph.
3. **Verification pipeline**
   - Schema validation, dependency/import analysis, secret scan, malware heuristics, license compatibility warnings.
   - Render previews in an isolated sandbox with network disabled by default.
   - Accessibility, typecheck, and basic runtime results shown as evidence—not a vague “verified” badge.
4. **Catalog and install**
   - Search/filter by category, framework, dependency, license, author, and verification status.
   - First-party `authored` CLI with `search`, `info`, `add`, `remove`, `update`, and `verify` commands.
   - Project detection for framework, package manager, language, styling system, and configured source aliases.
   - Install plans that show files, dependencies, scripts, transforms, conflicts, license obligations, and verification evidence before writing.
   - Adapter support for shadcn registries at launch plus a native manifest for non-shadcn React components.
   - Lockfile recording exact component version, source commit, content hashes, applied transforms, and locally modified files.
   - shadcn-compatible endpoint for ecosystem interoperability, without making shadcn the canonical data model.
   - Read-only MCP tools: search, inspect provenance, compare, and return an install plan.
   - CLI requires confirmation when license or verification warnings exist.
5. **Author controls**
   - Claim profile, edit metadata through source-controlled files, deprecate a release, respond to derivation disputes.
   - Basic aggregate install analytics with privacy-preserving defaults.

**Explicitly exclude from MVP:** Vue and Svelte catalogs, AI generation, automatic cross-framework code conversion, component remixing, payouts, reviews/comments, enterprise SSO, and a custom visual editor.

### Future framework expansion

After the React catalog, CLI, and business model are proven, add **Vue** and **Svelte** as first-class ecosystems. Each should use native components, previews, verification rules, dependency handling, and framework-specific install adapters—not automatically converted React code. Expansion should be gated on committed authors and real install demand in each ecosystem.

### Phase 2: paid private registries (months 3–5)

- Organizations, seats, roles, and registry-level permissions.
- Private GitHub/GitLab source ingestion.
- Short-lived installation tokens and scoped service accounts for agents/CI.
- Audit log: who searched, inspected, installed, published, or revoked.
- Policy gates: approved licenses, dependencies, verification thresholds, and destinations.
- Version channels, deprecation notices, and update diffs that preserve local modifications.
- Hosted preview/build workers, retention, backups, support, and regional controls.

### Pricing strategy

Do **not** copy 21st.dev's $8 Builder paywall for code copies and registry installs. Modulora's strategic wedge is that public, creator-authorized components remain genuinely open: browsing, source inspection, CLI installation, provenance, baseline scans, and MCP discovery are free. Charging buyers to use open-source code would weaken adoption and creator trust.

Launch with no buyer subscription and only two monetization surfaces:

| Product | Launch price hypothesis | Boundary |
|---|---:|---|
| Public registry | Free | Unlimited public listings, public code display, install commands, CLI/MCP, baseline trust evidence, creator profiles, and self-hosting |
| Promoted placement | Manual, from $49/week | Clearly labeled placement for eligible listings; sold only after traffic is measurable |

Add hosted private registries only after design partners validate the workflow:

| Cloud plan | Price hypothesis | Boundary |
|---|---:|---|
| Team | $15/seat/month or $12 annually; 3-seat minimum | Private registries, scoped install tokens, roles, shared collections, 30-day audit log, hosted scans/previews |
| Business | $29/seat/month; 10-seat minimum | SSO, policy gates, approval workflows, one-year audit retention, priority support |
| Enterprise | Custom annual contract | SCIM, custom retention, dedicated region/VPC options, SLA, legal and security review |

Possible later products:

- **Creator Pro ($15/month hypothesis):** advanced aggregate analytics, custom domains, advanced profile branding, webhooks, release channels, and lead capture. Every creator profile—including component listings, links, and core identity customization—must remain free. Ownership verification and baseline security scans must also remain free and must never become pay-to-win badges.
- **Hosted commercial delivery:** creator checkout, entitlements, signed private installs, and updates. Test a 10% platform fee only when Modulora actually handles payment and delivery. External purchase links remain free and incur no take rate.
- **Usage overages:** apply only to expensive private preview/build compute, not public installs, searches, or code copies.

Pricing principles:

1. Monetize hosted privacy, governance, compute, promotion, and commerce—not public source access.
2. Never sell trust scores, verification outcomes, or organic rank.
3. Do not sell promotion until creators can see credible traffic and conversion evidence.
4. Keep creator fees optional until the platform delivers measurable business value.
5. Validate willingness to pay with five private-registry design partners before building billing tiers.

### Paid component promotion

Authors may also pay to highlight a public component, creating a lightweight revenue stream before marketplace payments are justified.

- Sell fixed-duration placements such as featured homepage slots, category sponsorships, and clearly labeled promoted search cards.
- Label every placement **Sponsored** or **Promoted**; never disguise payment as editorial approval or verification quality.
- Require the same ownership, provenance, license, security, and quality checks as organic listings.
- Keep organic search ranking independent from ad spend. Promotion buys visibility, not a higher trust score.
- Apply frequency caps and reserve most catalog inventory for organic results so discovery remains useful.
- Publish pricing and placement rules. A reasonable first test is $25–$100 per week depending on traffic and position, sold manually before building an ad auction.
- Report impressions, component-page visits, provenance inspections, and verified installs to the author. Do not sell user-level browsing data.
- Reject misleading, abandoned, disputed, or low-quality components even if the author is willing to pay.

This model aligns well with creator acquisition because the paying customer is also the supply-side user. Its main risk is corrupting trust: paid visibility must remain visibly separate from verification and editorial curation.

### Phase 3: creator marketplace (only after liquidity)

- Authors opt individual items or bundles into paid distribution; nothing is monetized by the platform without explicit ownership verification and seller consent.
- Creator chooses license terms from reviewed templates; buyer sees them before purchase and inside the install manifest.
- Start with a 10% platform fee plus payment processing. Reward exclusivity or high volume later rather than beginning with an aggressive take rate.
- Entitlements should grant access to signed versions, updates, and invoices; they cannot technically prevent copied source from leaking, so sell convenience, updates, support, and trusted provenance rather than pretend DRM is durable.
- Delay payouts until identity, tax, refunds, chargebacks, sanctions screening, and dispute workflows are operational.

---

## Agent and Protocol Strategy

Do not make MCP or shadcn the core protocol. Clients and ecosystem formats change; signed Authored manifests are the durable contract.

1. Publish a versioned JSON Schema for registry and provenance manifests.
2. Expose a documented HTTP API and OpenAPI spec.
3. Make the Authored CLI the primary human and automation interface, backed by a reusable installer library.
4. Build shadcn, MCP, and `SKILL.md` adapters over the same manifest, installer, and API; add Vue and Svelte adapters in a later phase.
5. Return citations and hashes in every agent response so an agent can include provenance in its plan.
6. Keep installation a deliberate CLI operation; read-only discovery can be automatic, but code writes require policy checks and user approval.

The differentiating agent flow is: **search → inspect evidence → explain trade-offs → install exact signed version**, not “prompt to generate another generic component.”

---

## License Recommendation — 2026-07-11

### Current state

The repository contains only an MIT license and one commit. Justin Levine is the sole listed contributor and copyright holder. Relicensing now is straightforward; it becomes harder after accepting contributions unless contributors sign a CLA or assign sufficient rights.

### Recommendation

Use a deliberate multi-license repository:

| Area | Recommended license | Why |
|---|---|---|
| Manifest schema, specs, generated types | Apache-2.0 | Maximum ecosystem adoption plus an explicit patent grant. |
| CLI, installer library, SDKs, and ecosystem/agent adapters | Apache-2.0 | Encourages every framework, registry, and agent vendor to integrate without copyleft concerns. |
| Community web/API/server | AGPL-3.0-only | Keeps the hosted platform genuinely open and requires modified network deployments to publish their changes. |
| Enterprise add-ons | Proprietary | Reserve SSO/SCIM, advanced policy, compliance, and dedicated operations for paid offerings if needed. |
| Third-party components | Per-item license | The platform must never relicense author code; preserve SPDX metadata and notices. |

This is **open core**, not “everything is open source.” Say that plainly if enterprise add-ons are proprietary. A stronger trust-first alternative is to keep all application features AGPL and monetize only the managed service, compute, compliance operations, and support. Start with that stronger model; create proprietary enterprise modules only after customers prove those features are required to fund the service.

Do not use BSL/FSL/SSPL while marketing the project as open source: these are source-available rather than OSI-approved open-source licenses. AGPL is an OSI-approved license, but it does not prevent a competitor from hosting the software; it requires them to offer corresponding source for networked modifications. The operational service, trusted catalog, author network, and moderation history must be the moat.

### Before accepting contributions

1. Replace the root MIT license with a clear licensing map and per-package license files.
2. Add `LICENSES/`, SPDX headers where practical, `NOTICE`, and a third-party attribution policy.
3. Adopt a lightweight CLA granting the project the ability to relicense contributed platform code, or commit to AGPL permanently and use a Developer Certificate of Origin. A CLA provides business flexibility but weakens the “cannot rug-pull the community” trust story.
4. Recommended trust choice: DCO for Apache protocol/tooling; AGPL contribution agreement that permits commercial licensing only for first-party enterprise distribution, with governance language and public notice of license changes. Have counsel draft/review this.
5. Add a component publishing agreement covering ownership, license authority, preview rights, marketplace rights, takedowns, and warranties.

This is strategic guidance, not legal advice. Open-source and marketplace counsel should review the final structure before launch.

---

## Naming — 2026-07-11

Best-effort domain checks used WHOIS/DNS; only registrar checkout confirms availability. Search checks are not trademark clearance.

| Name | Style | Domain signal | Conflict/read |
|---|---|---|---|
| **Authored** | evocative | `authoredui.com` likely available | Best fit for creator credit and canonical ownership; product can be “Authored,” domain can be Authored UI. |
| Attest UI | descriptive | `attestui.com` likely available | Strong verification signal but sounds compliance/security-heavy; “Attest” is crowded in adjacent software. |
| Guild UI | community | `guildui.com` likely available | Creator-positive, but “guild” is generic and used across developer communities. |
| Sourced UI | descriptive | `sourcedui.com` likely available | Clearly communicates origin, but an older `source{d} UI` repository creates confusion. |
| Byline UI | metaphor | `bylineui.com` likely available | Excellent attribution metaphor, but Byline CMS already publishes `@byline/ui`; reject. |

**Recommended working name: Authored.** It turns the differentiator into the brand: every component is authored by someone, and that relationship should remain visible. It also supports useful language—Authored component, Authored registry, verified author—without locking the company to React or shadcn.

**Backup: Attest UI**, if trademark review clears it and the product leans more heavily toward supply-chain verification.

Before committing: run USPTO/WIPO and relevant international trademark searches, check npm/GitHub/social handles, and purchase the domain through a registrar. Do not announce the name based only on this preliminary search.

## Naming Round 2 — 2026-07-11

The naming direction changed to a standalone developer-tool brand. Availability below was checked against the exact unscoped npm package and exact GitHub account/organization name. Domain results are best-effort WHOIS/RDAP signals and are not guaranteed until checkout. Search results are only a preliminary conflict screen, not trademark clearance.

| Name | npm | GitHub | Best domain signal | Conflict/read |
|---|---|---|---|---|
| **Kitrove** | `kitrove` appears available | `github.com/kitrove` appears available | `kitrove.io`, `kitrove.sh`, and `getkitrove.com` appear available | Strongest candidate: “kit” + “trove” suggests a valuable collection without limiting the product to shadcn or React forever. Exact-name searches found no meaningful software product conflict. |
| **Moduleyard** | `moduleyard` appears available | `github.com/moduleyard` appears available | `moduleyard.com` and `.io` appear available | Clear place where reusable modules live; slightly industrial and less distinctive. Search results mainly reference physical construction module yards. |
| **Moduloop** | `moduloop` appears available | `github.com/moduloop` appears available | `moduloop.io` and `.sh` appear available | Suggests reusable modules and updates, but the double “o” creates spelling ambiguity. |
| **Sourcelane** | `sourcelane` appears available | `github.com/sourcelane` appears available | `sourcelane.io` and `.sh` appear available | Good source-first meaning, but more descriptive and less ownable as a broad brand. |
| **Kitdock** | `kitdock` appears available | `github.com/kitdock` appears available | `kitdock.io` appears available | Strong install/docking metaphor, but search noise from physical dock hardware weakens distinctiveness. |
| **Kitverse** | `kitverse` appears available | `github.com/kitverse` appears available | `kitverse.io` appears available | Broad ecosystem feel, but an existing game project already uses Kitverse. Not recommended. |

**Recommended pick: Kitrove.** It is easy to pronounce and spell, works naturally as the CLI command (`kitrove add …`), and has the strongest combination of brand flexibility and ecosystem relevance. The exact `.com` appears registered, so the pragmatic domain would be `kitrove.io` or `getkitrove.com`.

**Backup: Moduleyard.** It has the cleanest apparent `.com` availability and communicates a place for reusable modules, but it is less polished and more generic than Kitrove.

Do not reserve npm, GitHub, or domains until the final candidate passes a professional trademark search. Availability can change at any time.

## Naming Round 3 — 2026-07-11

The preferred naming root is **module**, expressed as one coined word. Preliminary checks found:

| Name | npm | GitHub | Domain signal | Assessment |
|---|---|---|---|---|
| **Modulora** | `modulora` appears available | `github.com/modulora` appears available | `modulora.io`, `modulora.sh`, `getmodulora.com`, and `usemodulora.com` appear available | Best balance: “module” is audible, the name is pronounceable, and initial search found no meaningful software conflict. |
| **Moduvaro** | `moduvaro` appears available | `github.com/moduvaro` appears available | `moduvaro.com` and `.io` appear available | Most ownable availability profile, but its relationship to “module” is less immediate. |
| **Moduloop** | `moduloop` appears available | `github.com/moduloop` appears available | `moduloop.io` and `.sh` appear available | Strong reuse/update metaphor; the adjacent double “o” creates spelling friction. |
| **Modulane** | `modulane` appears available | `github.com/modulane` appears available | Alternative domains may be available | Clear “module distribution lane” idea, but existing software and furniture businesses named Modulane create avoidable conflict. |
| **Moduleo** | `moduleo` appears available | `github.com/moduleo` appears available | Exact domains are constrained | Reject: Moduleo is already an established flooring brand. |
| **Modulium** | `modulium` appears available | `github.com/modulium` appears available | Alternative domains may be available | Reject: an existing company/startup uses Modulium. |

**Recommended pick: Modulora.** It works as a company, platform, package, and CLI name:

```bash
npx modulora add author/component
modulora search date-picker
modulora verify author/component
```

**Availability-first backup: Moduvaro.** Its exact `.com`, npm package, and GitHub handle all appeared available during this check, but it is a weaker spoken connection to modules.

These are preliminary checks, not trademark clearance or guaranteed reservations.

---

## Go-to-Market

### Supply before demand

1. Recruit 10 launch authors manually. Offer verified profiles, migration help, analytics, and featured placement—not cash for bulk uploads.
2. Publish a public “Component Provenance Spec” with 3–5 respected authors as design partners.
3. Build adapters that index their existing GitHub registries without forcing a platform migration.
4. Launch with curated collections where every item has an explicit source, license, and maintainer.

### Developer acquisition

- Free CLI and MCP tools that search across opted-in registries and install compatible React source components.
- GitHub Action that emits signed provenance manifests and verification badges.
- Public comparison pages based on objective metadata: dependencies, bundle surface, license, accessibility evidence, and maintenance—not scraped screenshots alone.
- SEO pages for high-intent jobs (“accessible date picker shadcn,” “agent chat components”) with creator-authored docs.
- Launch adapters for `scn-stack`, shadcn namespaces, and GitHub Apps, followed later by Vue and Svelte publisher tooling when each ecosystem has committed launch authors.

### Team sales

Target agencies and product teams that already have an internal `components/` folder but lack discoverability and governance. Sell a paid pilot around one measurable outcome: reduce duplicate component implementation and unsafe agent-generated UI code.

---

## Metrics and Gates

### North-star metric

**Verified installs that retain a resolvable provenance chain.** Raw page views and copied snippets are vanity metrics.

### MVP gates

- 10 verified authors.
- 200 authorized, provenance-complete components.
- 1,000 monthly verified installs across at least 100 distinct repositories.
- At least 30% of installers return within four weeks.
- Fewer than 2% of listings enter ownership/license disputes; median dispute acknowledgment under 24 hours.
- 5 paid private-registry design partners or signed letters of intent.

### Kill/reshape criteria

- Authors will not connect canonical repositories unless code is copied into the platform.
- Developers ignore provenance evidence and choose solely on screenshots/novelty.
- Teams will not pay at least $30–50/month for private registry governance.
- More than half of useful catalog growth depends on unclaimed scraping.

If these occur, reshape toward a self-hosted provenance and policy layer for private registries rather than a public marketplace.

---

## 90-Day Execution Plan

### Days 1–14: evidence and commitments

- Interview 15 authors, 15 app developers, and 10 team/design-system leads.
- Secure 10 author design partners and 5 team pilot commitments.
- Publish the provenance manifest RFC and component publishing principles.
- Complete legal review and license restructuring before external contributions.
- Reserve the final name/domain only after trademark screening.

### Days 15–45: thin vertical slice

- GitHub App ownership verification and registry ingestion.
- Immutable releases, hashes, SPDX metadata, and signed manifests.
- Isolated preview and verification worker.
- Catalog, component evidence page, universal CLI inspect/install, shadcn adapter, and at least one non-shadcn React component path.
- Read-only MCP adapter.

### Days 46–70: private pilot

- Organizations, private repositories, scoped tokens, seats, and audit logs.
- Stripe subscriptions with one Team plan.
- Onboard five pilots manually and measure duplicate work avoided, install success, and agent-policy usage.

### Days 71–90: public launch decision

- Publish transparent verification methodology and moderation/takedown SLA.
- Launch the curated public catalog only if author and component gates are met.
- Publish pilot case studies and a public roadmap.
- Decide whether marketplace payments are justified; do not build them unless authors are asking to sell and buyer demand is observable.

---

## Immediate Next Decisions

1. Validate `Authored` with legal/domain/handle checks or choose the backup.
2. Decide whether the project promises **fully AGPL application code** or **AGPL community + proprietary enterprise modules**.
3. Interview/recruit design partners before selecting the implementation stack.
4. Write the provenance manifest RFC before designing database tables or UI.

---

## Sources

- [21st.dev — Introducing 21st membership](https://21st.dev/community/blog/introducing-21st-membership)
- [21st.dev — Component Libraries](https://21st.dev/community/blog/component-libraries)
- [21st.dev registry CLI (GitHub)](https://github.com/21st-dev/registry)
- [shadcn/ui Registry introduction](https://ui.shadcn.com/docs/registry)
- [shadcn/ui GitHub registries](https://ui.shadcn.com/docs/registry/github)
- [addcn (GitHub)](https://github.com/yassinezaanouni/addcn)
- [R-HUB](https://rhub.dev/)
- [Stow marketplace](https://www.stow.build/)
- [shopcn](https://shopcn.dev/)
- [Fair Source license overview](https://fair.io/licenses/)
- [GNU AGPL v3](https://www.gnu.org/licenses/agpl-3.0.html)
- [Open Source Initiative licenses](https://opensource.org/licenses)

---

## Stack Comparison — 2026-07-11

### TanStack Start for Modulora

**Recommendation: use TanStack Start for the public web application and its browser-facing backend-for-frontend, but do not make it the entire platform backend.**

TanStack Start is currently a release candidate. Its official documentation describes the API as stable and feature-complete while still acknowledging pre-v1 rough edges. That is acceptable for an early-stage product if versions are pinned and upgrades are deliberate. Its typed routing, server functions, SSR, Vite foundation, and deployment portability fit an open-core project better than coupling the architecture to a single hosting vendor.

| Criterion | TanStack Start | Next.js | Modulora read |
|---|---|---|---|
| Product fit | Typed routes, SSR, server functions, portable runtime adapters | Mature full-stack React framework with broad feature coverage | Start fits the catalog/dashboard UI and contributor-friendly type safety. |
| Maturity | Release candidate; API described as stable, ecosystem still developing | Established production ecosystem | Next.js wins on maturity; Start's risk is manageable before launch. |
| Self-hosting | Designed for multiple runtimes/hosts | Proven Node/Docker path, but ecosystem often assumes Vercel | Start better reinforces Modulora's portable open-core story. |
| External API | Server routes are supported; server functions are app-internal RPC | Route handlers are mature | Neither should own Modulora's entire public registry protocol. |
| Contributor experience | Explicit router-first architecture and end-to-end types | Larger contributor familiarity and example pool | Start is cleaner; Next is easier to hire for. |
| Lock-in/exit | Vite and web-standard orientation reduce framework/platform coupling | Framework migration can be expensive | Start has the better strategic direction if kept behind package boundaries. |

### Framework boundary

Use TanStack Start for:

- Public catalog, search pages, component evidence pages, author profiles, and documentation UI.
- Signed-in author dashboard and the hosted team dashboard.
- SSR, route loaders, forms, sessions, and browser-facing server functions.
- Thin composition of domain services; server functions may call application packages but should not contain core registry logic.

Do not put these exclusively inside TanStack Start:

- Manifest schemas, provenance verification, installer behavior, and component resolution.
- Public API contracts used by the CLI, MCP clients, CI, or third-party registries.
- Long-running preview builds, sandbox execution, scans, queues, and scheduled jobs.
- Billing, promotion allocation, marketplace payouts, enterprise policy, or infrastructure orchestration.

Those belong in framework-agnostic packages/services so the open server, hosted cloud, CLI, and workers share the same contracts without importing the web framework.

### Proposed application layout

```text
apps/
  web/              # TanStack Start public catalog + dashboard
  api/              # framework-neutral public HTTP API
  worker/           # verification, preview, scan, and indexing jobs
packages/
  domain/           # registry, provenance, publishing rules
  db/               # open-core schema and repositories
  api-contract/     # OpenAPI/types generated from the public spec
  auth/             # self-hostable user/session primitives
  ui/               # Modulora product UI
```

The proprietary cloud repository can add private-registry, billing, promotion, and enterprise services around these public contracts. Closed packages may import public packages; public packages must never import closed packages.

### Tradeoff and escape hatch

The cost is adopting a pre-v1 framework with fewer production examples than Next.js. Pin exact versions, avoid experimental React Server Components, keep domain logic out of route files, and maintain a Node/Docker reference deployment. If Start experiences breaking churn, weak adapter support, or blocks self-hosting, the framework-neutral API/domain boundary allows replacing only `apps/web`.

**Sources:**

- [TanStack Start overview](https://tanstack.com/start/latest/docs/framework/react/overview)
- [TanStack Start server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Start authentication overview](https://tanstack.com/start/latest/docs/framework/react/guide/authentication-overview)
- [TanStack Start framework comparison](https://tanstack.com/start/latest/docs/framework/react/comparison)
- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
